/* ===================================================================
   ARENA — MESSAGES.JS
   Módulo compartilhado de mensagens diretas (DM). Mesmo padrão dos
   outros módulos data/*.js: uma fonte única, carregada em qualquer
   página que precise ler/enviar DMs ou mostrar o badge de não lidas.

   IMPORTANTE — isso é uma simulação client-side: como não existe
   backend real, a conversa só existe no localStorage de QUEM ENVIA.
   Se "fulano@teste.com" manda uma mensagem pra "ciclana@teste.com" no
   mesmo navegador (trocando de conta), a conversa aparece pros dois,
   porque compartilham o mesmo localStorage. Entre navegadores/contas
   de verdade diferentes, isso não sincroniza — é uma limitação
   conhecida do projeto (mesma limitação que já existe em seguidores,
   mural, etc.), não um bug.

   Storage:
     `arena-dm-<par ordenado dos e-mails>`
        → array de mensagens, mais antiga primeiro:
          { id, from, text, at }

     `arena-dm-index-<email>`
        → array de "resumo de conversa" pra montar a lista lateral
          sem precisar varrer todo mundo:
          { partner, lastText, lastFrom, lastAt }

     `arena-dm-reads-<email>`
        → objeto { [partnerEmail]: timestamp } — até quando aquele
          usuário já leu a conversa com aquele parceiro.

   Requer data/utils.js carregado ANTES deste script.

   Uso:
     const {
       conversationKey, getMessages, sendMessage,
       listConversations, getUnreadCount, getTotalUnread,
       markConversationRead, mountNavBadge,
     } = window.ArenaMessages;
   =================================================================== */
(function (global) {
  "use strict";

  if (!global.ArenaUtils) {
    console.error("ArenaMessages: data/utils.js precisa ser carregado antes de data/messages.js");
  }
  const { readJSON, writeJSON } = global.ArenaUtils || {};

  // ===== CHAVE DA CONVERSA =====
  // Sempre a mesma chave nos dois sentidos — ordena os e-mails antes
  // de montar a chave, então A→B e B→A caem no mesmo par.
  function conversationKey(emailA, emailB) {
    return `arena-dm-${[emailA, emailB].sort().join("::")}`;
  }
  function indexKey(email) { return `arena-dm-index-${email || "demo"}`; }
  function readsKey(email) { return `arena-dm-reads-${email || "demo"}`; }

  // ===== MENSAGENS DE UMA CONVERSA =====
  function getMessages(emailA, emailB) {
    return readJSON(conversationKey(emailA, emailB), []);
  }

  // ===== ÍNDICE (lista de conversas de um usuário) =====
  function getConversationIndex(email) {
    return readJSON(indexKey(email), []);
  }

  function upsertIndexEntry(email, partner, lastText, lastFrom, lastAt) {
    const list = getConversationIndex(email);
    const existing = list.find(c => c.partner === partner);
    if (existing) {
      existing.lastText = lastText;
      existing.lastFrom = lastFrom;
      existing.lastAt = lastAt;
    } else {
      list.push({ partner, lastText, lastFrom, lastAt });
    }
    writeJSON(indexKey(email), list);
  }

  // Lista de conversas do usuário, mais recente primeiro. `resolveFn`
  // (opcional) recebe o e-mail do parceiro e devolve os dados de
  // exibição dele (nome, avatar, username) — quem chama normalmente
  // passa a mesma função usada pra montar cards de jogador na página.
  function listConversations(email, resolveFn) {
    const list = getConversationIndex(email).slice().sort((a, b) => b.lastAt - a.lastAt);
    return list.map(c => ({
      ...c,
      unread: getUnreadCount(email, c.partner),
      player: typeof resolveFn === "function" ? resolveFn(c.partner) : null,
    }));
  }

  // ===== PERMISSÃO DE ENVIO =====
  // Respeita o toggle de privacidade allowDmFromStrangers (definido em
  // perfil-config.html, dentro de profile.privacy). Como o site não
  // tem um conceito formal de "amigo", uso seguir mútuo (A segue B E
  // B segue A) como proxy de "amigo" — é a relação mais próxima disso
  // que já existe no projeto (arena-following-<email>).
  //
  // Regras, na ordem:
  //   1) já existe alguma mensagem trocada nessa conversa → sempre
  //      permite continuar (impede que alguém que já respondeu fique
  //      bloqueado depois só porque mudou a configuração de privacidade).
  //   2) destinatário tem allowDmFromStrangers ligado → permite.
  //   3) remetente e destinatário se seguem mutuamente → permite.
  //   4) caso contrário → bloqueia.
  function canMessage(fromEmail, toEmail) {
    if (!fromEmail || !toEmail || fromEmail === toEmail) {
      return { allowed: false, reason: "Não é possível iniciar essa conversa." };
    }

    const existing = readJSON(conversationKey(fromEmail, toEmail), []);
    if (existing.length > 0) return { allowed: true };

    const toProfile = readJSON(`arena-profile-${toEmail}`, {});
    const privacy = toProfile.privacy || {};
    if (privacy.allowDmFromStrangers) return { allowed: true };

    const toFollowing = readJSON(`arena-following-${toEmail}`, []);
    const fromFollowing = readJSON(`arena-following-${fromEmail}`, []);
    const mutual = toFollowing.includes(fromEmail) && fromFollowing.includes(toEmail);
    if (mutual) return { allowed: true };

    return {
      allowed: false,
      reason: "Este jogador só recebe mensagens de quem ele segue de volta. Sigam-se mutuamente pra poder conversar.",
    };
  }

  // ===== ENVIAR =====
  function sendMessage(fromEmail, toEmail, text) {
    const clean = (text || "").trim();
    if (!fromEmail || !toEmail || !clean) return null;

    const check = canMessage(fromEmail, toEmail);
    if (!check.allowed) return { blocked: true, reason: check.reason };

    const key = conversationKey(fromEmail, toEmail);
    const list = readJSON(key, []);
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: fromEmail,
      text: clean.slice(0, 2000),
      at: Date.now(),
    };
    list.push(msg);
    writeJSON(key, list);

    upsertIndexEntry(fromEmail, toEmail, msg.text, fromEmail, msg.at);
    upsertIndexEntry(toEmail, fromEmail, msg.text, fromEmail, msg.at);

    // quem manda já "leu" a própria mensagem
    markConversationRead(fromEmail, toEmail);

    if (global.ArenaSocial) {
      global.ArenaSocial.notify(toEmail, "✉️", "te enviou uma mensagem", `mensagens.html?user=${encodeURIComponent(fromEmail)}`, fromEmail);
    }
    return msg;
  }

  // ===== LEITURA / NÃO LIDAS =====
  function getLastRead(email, partner) {
    const reads = readJSON(readsKey(email), {});
    return reads[partner] || 0;
  }

  function markConversationRead(email, partner) {
    const reads = readJSON(readsKey(email), {});
    reads[partner] = Date.now();
    writeJSON(readsKey(email), reads);
  }

  function getUnreadCount(email, partner) {
    const lastRead = getLastRead(email, partner);
    return getMessages(email, partner).filter(m => m.from === partner && m.at > lastRead).length;
  }

  function getTotalUnread(email) {
    return getConversationIndex(email).reduce((sum, c) => sum + getUnreadCount(email, c.partner), 0);
  }

  // Usado pro "✓✓" nas próprias mensagens: `fromEmail` é quem mandou,
  // `toEmail` é quem devia ler. Compara o horário da mensagem com o
  // último "lastRead" que `toEmail` registrou pra essa conversa.
  function isReadByRecipient(fromEmail, toEmail, at) {
    return getLastRead(toEmail, fromEmail) >= at;
  }

  // ===================================================================
  // "DIGITANDO..." — como tudo aqui é localStorage (sem servidor), isso
  // só funciona de verdade entre ABAS DIFERENTES DO MESMO NAVEGADOR
  // (ex: uma conta em cada aba) — mesma limitação/mesmo espírito do
  // resto do sistema social do site (seguidores, mural etc.), que
  // também dependem do localStorage ser compartilhado entre as contas.
  //   `arena-dm-typing-<par ordenado>` → { [email]: timestamp }
  // ===================================================================
  const TYPING_TTL_MS = 3000;
  function typingKey(emailA, emailB) { return `arena-dm-typing-${[emailA, emailB].sort().join("::")}`; }

  function setTyping(email, partner) {
    const key = typingKey(email, partner);
    const data = readJSON(key, {});
    data[email] = Date.now();
    writeJSON(key, data);
  }

  // Chamado da perspectiva de quem está OLHANDO a conversa: "o meu
  // parceiro está digitando pra mim agora?"
  function isPartnerTyping(email, partner) {
    const data = readJSON(typingKey(email, partner), {});
    const ts = data[partner];
    return !!ts && (Date.now() - ts < TYPING_TTL_MS);
  }

  // ===================================================================
  // BADGE DE NAV — igual em espírito ao initHeaderBell do social.js,
  // mas simples: só injeta a contagem num <span> que já existe no
  // link "Mensagens" do header de cada página.
  //   ArenaMessages.mountNavBadge("dm-nav-badge")
  // Não faz nada se não houver sessão ou o elemento não existir —
  // então é seguro chamar em qualquer página sem checar antes.
  // ===================================================================
  function mountNavBadge(elementId, email) {
    const utils = global.ArenaUtils;
    const resolvedEmail = email || (utils && utils.getSessionEmail());
    const el = document.getElementById(elementId);
    if (!resolvedEmail || !el) return;
    const total = getTotalUnread(resolvedEmail);
    if (total > 0) {
      el.textContent = total > 9 ? "9+" : String(total);
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  global.ArenaMessages = {
    conversationKey, getMessages, sendMessage, canMessage,
    listConversations, getConversationIndex,
    getLastRead, markConversationRead, getUnreadCount, getTotalUnread, isReadByRecipient,
    setTyping, isPartnerTyping,
    mountNavBadge,
  };
})(window);
