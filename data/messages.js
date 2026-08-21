/* ===================================================================
   ARENA — MESSAGES.JS  (DMs de volta pro localStorage)

   POR QUÊ: este módulo tinha sido migrado pra depender do Firestore
   (data/firebase-config.js), mas esse arquivo nunca chegou a ser
   configurado — sem ele, `ArenaFirebase.db` fica undefined, e QUALQUER
   chamada que toca o Firestore (inclusive `mountNavBadge`, chamado por
   quase toda página do site pra mostrar o badge de mensagens não
   lidas no menu) lança uma exceção e quebra o resto do <script> da
   página. Como isso só acontecia depois que a sessão já estava
   resolvida, o efeito só apareceu depois que o login voltou a
   funcionar de verdade (ver data/utils.js).

   Este arquivo volta a guardar tudo em localStorage, mesma
   abordagem "demo" de antes da migração. A API pública
   (`window.ArenaMessages`) continua IDÊNTICA em nome/assinatura —
   inclusive o estilo "subscribe" com callback + função de
   unsubscribe — pra não quebrar mensagens.html, share-target.html
   nem o badge de navegação usado em quase toda página.

   LIMITAÇÃO (igual antes da migração pro Firestore): como não há
   backend, isso só sincroniza entre ABAS DO MESMO NAVEGADOR (via
   evento nativo `storage`, que só dispara em OUTRAS abas — a própria
   aba que escreveu se atualiza via um CustomEvent interno). Duas
   contas em dois computadores diferentes não conversam de verdade
   até o Firebase ser configurado.

   ESTRUTURA NO LOCALSTORAGE:
     arena-dm-conversations                → array de resumos:
       { key, participants:[a,b], lastText, lastFrom, lastAt,
         unread:{email:n}, reads:{email:ts}, typing:{email:ts} }
     arena-dm-msgs-<conversationKey>        → array de mensagens:
       { from, text, at }

   `conversationKey` continua sendo os dois e-mails ordenados e
   juntos, igual sempre foi.

   Requer data/utils.js carregado ANTES deste script.
   =================================================================== */
(function (global) {
  "use strict";

  if (!global.ArenaUtils) {
    console.error("ArenaMessages: data/utils.js precisa ser carregado antes de data/messages.js");
  }
  const { readJSON, writeJSON } = global.ArenaUtils || {};

  const TYPING_TTL_MS = 3000;
  const CONV_LIST_KEY = "arena-dm-conversations";
  const MSG_KEY_PREFIX = "arena-dm-msgs-";
  const LOCAL_EVENT = "arena-dm-changed";

  // ===== ID DA CONVERSA — ordena os e-mails antes de montar a chave,
  // então A→B e B→A caem sempre na mesma conversa. =====
  function conversationKey(emailA, emailB) {
    return [emailA, emailB].sort().join("::");
  }

  function messagesKey(emailA, emailB) {
    return MSG_KEY_PREFIX + conversationKey(emailA, emailB);
  }

  function loadConvList() { return readJSON(CONV_LIST_KEY, []); }
  function saveConvList(list) { writeJSON(CONV_LIST_KEY, list); }
  function findConvEntry(list, key) { return list.find(c => c.key === key); }

  function upsertConvEntry(entry) {
    const list = loadConvList();
    const idx = list.findIndex(c => c.key === entry.key);
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    saveConvList(list);
  }

  // Avisa quem está com uma inscrição aberta NESTA MESMA aba (o evento
  // nativo "storage" só dispara em outras abas/janelas).
  function notifyChange(key) {
    global.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key } }));
  }

  // ===================================================================
  // PERMISSÃO DE ENVIO — inalterada: lê privacidade
  // (arena-profile-<email>) e seguidores (arena-following-<email>).
  //   1) já existe conversa com mensagem trocada → sempre permite.
  //   2) destinatário tem allowDmFromStrangers ligado → permite.
  //   3) remetente e destinatário se seguem mutuamente → permite.
  //   4) caso contrário → bloqueia.
  // ===================================================================
  function canMessage(fromEmail, toEmail) {
    if (!fromEmail || !toEmail || fromEmail === toEmail) {
      return { allowed: false, reason: "Não é possível iniciar essa conversa." };
    }

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

  // ===================================================================
  // ENVIAR — continua devolvendo uma Promise (pra não quebrar o
  // .then()/.catch() que mensagens.html e share-target.html já usam),
  // mas agora resolve na hora, sem round-trip de rede.
  // ===================================================================
  function sendMessage(fromEmail, toEmail, text) {
    const clean = (text || "").trim();
    if (!fromEmail || !toEmail || !clean) return Promise.resolve(null);

    const key = conversationKey(fromEmail, toEmail);
    const msgs = readJSON(MSG_KEY_PREFIX + key, []);
    const alreadyTalked = msgs.length > 0;
    const check = canMessage(fromEmail, toEmail);
    if (!alreadyTalked && !check.allowed) {
      return Promise.resolve({ blocked: true, reason: check.reason });
    }

    const now = Date.now();
    const msg = { from: fromEmail, text: clean.slice(0, 2000), at: now };
    msgs.push(msg);
    writeJSON(MSG_KEY_PREFIX + key, msgs);

    const list = loadConvList();
    const prev = findConvEntry(list, key) || { key, participants: [fromEmail, toEmail], unread: {}, reads: {}, typing: {} };
    const entry = {
      key,
      participants: [fromEmail, toEmail],
      lastText: msg.text,
      lastFrom: fromEmail,
      lastAt: now,
      unread: { ...(prev.unread || {}), [toEmail]: ((prev.unread || {})[toEmail] || 0) + 1 },
      // quem manda já "leu" a própria mensagem
      reads: { ...(prev.reads || {}), [fromEmail]: now },
      typing: prev.typing || {},
    };
    upsertConvEntry(entry);
    notifyChange(key);

    if (global.ArenaSocial) {
      global.ArenaSocial.notify(toEmail, "✉️", "te enviou uma mensagem", `mensagens.html?user=${encodeURIComponent(fromEmail)}`, fromEmail);
    }

    return Promise.resolve(msg);
  }

  // ===================================================================
  // MENSAGENS DE UMA CONVERSA — chama `callback` na hora com o estado
  // atual e de novo toda vez que mudar (nesta aba via CustomEvent
  // interno, em outras abas via evento nativo "storage"). Devolve uma
  // função de unsubscribe, igual à versão Firestore.
  // ===================================================================
  function subscribeMessages(emailA, emailB, callback) {
    const key = conversationKey(emailA, emailB);
    const storageKey = MSG_KEY_PREFIX + key;

    function refresh() { callback(readJSON(storageKey, [])); }
    refresh();

    function onStorage(e) { if (!e.key || e.key === storageKey) refresh(); }
    function onLocal(e) { if (e.detail && e.detail.key === key) refresh(); }
    global.addEventListener("storage", onStorage);
    global.addEventListener(LOCAL_EVENT, onLocal);

    return () => {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }

  // ===================================================================
  // LISTA DE CONVERSAS — todas as conversas de `email`, mais recente
  // primeiro, já com `unread` calculado. `resolveFn` (opcional) recebe
  // o e-mail do parceiro e devolve os dados de exibição.
  // ===================================================================
  function subscribeConversationList(email, resolveFn, callback) {
    function refresh() {
      const list = loadConvList()
        .filter(c => c.participants.includes(email))
        .map(c => {
          const partner = c.participants.find(p => p !== email);
          return {
            id: c.key,
            partner,
            lastText: c.lastText,
            lastFrom: c.lastFrom,
            lastAt: c.lastAt,
            unread: (c.unread && c.unread[email]) || 0,
            player: typeof resolveFn === "function" ? resolveFn(partner) : null,
          };
        })
        .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
      callback(list);
    }
    refresh();

    function onStorage(e) { if (!e.key || e.key === CONV_LIST_KEY) refresh(); }
    function onLocal() { refresh(); }
    global.addEventListener("storage", onStorage);
    global.addEventListener(LOCAL_EVENT, onLocal);

    return () => {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }

  // ===== LEITURA — marca como lida (zera unread + atualiza reads) =====
  function markConversationRead(email, partner) {
    const key = conversationKey(email, partner);
    const list = loadConvList();
    const prev = findConvEntry(list, key) || { key, participants: [email, partner], unread: {}, reads: {}, typing: {} };
    const entry = {
      ...prev,
      participants: [email, partner],
      unread: { ...(prev.unread || {}), [email]: 0 },
      reads: { ...(prev.reads || {}), [email]: Date.now() },
    };
    upsertConvEntry(entry);
    notifyChange(key);
    return Promise.resolve();
  }

  // ===== TOTAL NÃO LIDAS — soma unread[email] de todas as conversas =====
  function subscribeTotalUnread(email, callback) {
    function refresh() {
      const total = loadConvList()
        .filter(c => c.participants.includes(email))
        .reduce((sum, c) => sum + ((c.unread || {})[email] || 0), 0);
      callback(total);
    }
    refresh();

    function onStorage(e) { if (!e.key || e.key === CONV_LIST_KEY) refresh(); }
    function onLocal() { refresh(); }
    global.addEventListener("storage", onStorage);
    global.addEventListener(LOCAL_EVENT, onLocal);

    return () => {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }

  // Usado pro "✓✓" nas próprias mensagens: compara o horário da
  // mensagem com o último "reads" que o destinatário registrou.
  function subscribeReadReceipt(fromEmail, toEmail, callback) {
    const key = conversationKey(fromEmail, toEmail);
    function refresh() {
      const entry = findConvEntry(loadConvList(), key);
      const reads = entry ? (entry.reads || {}) : {};
      callback(reads[toEmail] || 0);
    }
    refresh();

    function onStorage(e) { if (!e.key || e.key === CONV_LIST_KEY) refresh(); }
    function onLocal(e) { if (e.detail && e.detail.key === key) refresh(); }
    global.addEventListener("storage", onStorage);
    global.addEventListener(LOCAL_EVENT, onLocal);

    return () => {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }

  // ===================================================================
  // "DIGITANDO..." — só funciona entre abas do MESMO navegador (mesma
  // limitação de antes da migração pro Firestore). setTyping é "fire
  // and forget" — chame a cada tecla digitada, com debounce simples do
  // lado de quem chama.
  // ===================================================================
  function setTyping(email, partner) {
    const key = conversationKey(email, partner);
    const list = loadConvList();
    const prev = findConvEntry(list, key) || { key, participants: [email, partner], unread: {}, reads: {}, typing: {} };
    const entry = { ...prev, participants: [email, partner], typing: { ...(prev.typing || {}), [email]: Date.now() } };
    upsertConvEntry(entry);
    notifyChange(key);
  }

  // Chamado da perspectiva de quem está OLHANDO a conversa. Reavalia o
  // TTL a cada mudança recebida E também a cada ~1s por conta própria
  // (via setInterval interno), assim o indicador some sozinho mesmo
  // sem nenhuma escrita nova chegando.
  function subscribeTyping(email, partner, callback) {
    const key = conversationKey(email, partner);
    function refresh() {
      const entry = findConvEntry(loadConvList(), key);
      const typing = entry ? (entry.typing || {}) : {};
      const ts = typing[partner];
      callback(!!ts && (Date.now() - ts < TYPING_TTL_MS));
    }
    refresh();

    function onStorage(e) { if (!e.key || e.key === CONV_LIST_KEY) refresh(); }
    function onLocal(e) { if (e.detail && e.detail.key === key) refresh(); }
    global.addEventListener("storage", onStorage);
    global.addEventListener(LOCAL_EVENT, onLocal);
    const interval = setInterval(refresh, 1000);

    return () => {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener(LOCAL_EVENT, onLocal);
      clearInterval(interval);
    };
  }

  // ===================================================================
  // BADGE DE NAV — usado por quase toda página do site.
  //   ArenaMessages.mountNavBadge("dm-nav-badge", meuEmail)
  // ===================================================================
  function mountNavBadge(elementId, email) {
    const el = document.getElementById(elementId);
    if (!email || !el) return () => {};
    return subscribeTotalUnread(email, (total) => {
      if (total > 0) {
        el.textContent = total > 9 ? "9+" : String(total);
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  }

  global.ArenaMessages = {
    conversationKey, canMessage, sendMessage,
    subscribeMessages, subscribeConversationList,
    markConversationRead, subscribeTotalUnread, subscribeReadReceipt,
    setTyping, subscribeTyping,
    mountNavBadge,
  };
})(window);
