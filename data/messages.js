/* ===================================================================
   ARENA — MESSAGES.JS  (migrado pra Firestore, tempo real de verdade)

   MUDANÇA DE FUNDO: antes tudo vivia no localStorage de quem enviava,
   e "sincronizar" com outra conta só funcionava se fosse o MESMO
   navegador (mesmo localStorage). Isso não existe mais — agora duas
   contas em dois computadores diferentes conversam de verdade, porque
   os dados moram no Firestore, não no navegador.

   ISSO TAMBÉM MUDA A FORMA DE LER DADOS: no localStorage, ler uma
   conversa era síncrono (getMessages() devolvia o array na hora). No
   Firestore, a forma certa de "ler e continuar recebendo atualizações"
   é INSCREVER-SE (onSnapshot), não pedir uma vez só. Por isso as
   funções de leitura mudaram de `getX()` (devolve valor) pra
   `subscribeX(..., callback)` (chama `callback` toda vez que algo
   muda, e devolve uma função `unsubscribe` pra parar de escutar).

   MAPA MENTAL — o que cada função antiga virou:

     getMessages(a, b)               → subscribeMessages(a, b, cb)
     listConversations(email, fn)    → subscribeConversationList(email, fn, cb)
     getTotalUnread(email)           → subscribeTotalUnread(email, cb)
     getUnreadCount(email, partner)  → incluso dentro do item da lista
                                        que subscribeConversationList já
                                        devolve (campo `unread`)
     isPartnerTyping(email, partner) → subscribeTyping(email, partner, cb)
     sendMessage(...)                → continua chamando igual, mas
                                        agora devolve uma Promise (antes
                                        devolvia o resultado na hora)
     markConversationRead(...)       → continua igual, mas devolve Promise
     canMessage(...)                 → CONTINUA SÍNCRONA — ainda lê
                                        privacidade/seguindo do
                                        localStorage (perfil e seguir
                                        ainda não foram migrados)
     mountNavBadge(elementId, email) → continua igual de fora, mas por
                                        dentro agora é uma inscrição
                                        (o badge atualiza sozinho, sem
                                        precisar chamar de novo)

   ESTRUTURA NO FIRESTORE:
     conversations/{conversationId}
       participants: [emailA, emailB]
       lastText, lastFrom, lastAt   → resumo pra montar a lista lateral
       unread: { [email]: number }  → contador por participante
       reads:  { [email]: number }  → timestamp de "até quando esse
                                       participante já leu" (usado pro
                                       ✓✓ nas próprias mensagens)
       typing: { [email]: number }  → timestamp do último "tô digitando"

     conversations/{conversationId}/messages/{messageId}
       from, text, at

   `conversationId` continua sendo os dois e-mails ordenados e juntos
   (mesma função conversationKey de antes), então dá pra migrar dados
   antigos do localStorage mantendo os mesmos IDs de conversa se algum
   dia você quiser rodar um script de importação.

   Requer data/utils.js (e portanto data/firebase-config.js) carregados
   ANTES deste script.
   =================================================================== */
(function (global) {
  "use strict";

  if (!global.ArenaFirebase) {
    console.error("ArenaMessages: data/firebase-config.js precisa ser carregado antes de data/messages.js");
  }
  if (!global.ArenaUtils) {
    console.error("ArenaMessages: data/utils.js precisa ser carregado antes de data/messages.js");
  }
  const { db } = global.ArenaFirebase || {};
  const { readJSON } = global.ArenaUtils || {};

  const TYPING_TTL_MS = 3000;

  // ===== ID DA CONVERSA — mesma lógica de sempre: ordena os e-mails
  // antes de montar a chave, então A→B e B→A caem no mesmo doc. =====
  function conversationKey(emailA, emailB) {
    return [emailA, emailB].sort().join("::");
  }

  function conversationRef(emailA, emailB) {
    return db.collection("conversations").doc(conversationKey(emailA, emailB));
  }

  // ===================================================================
  // PERMISSÃO DE ENVIO — inalterada em espírito, ainda síncrona: lê
  // privacidade (arena-profile-<email>) e seguidores (arena-following-
  // <email>) do localStorage, porque esses dois ainda não migraram pra
  // Firestore. No dia que migrarem, só o corpo desta função muda — quem
  // chama continua igual.
  //
  //   1) já existe conversa com mensagem trocada → sempre permite.
  //      (aqui isso vira "sempre permite", já que checar histórico
  //      exigiria uma leitura assíncrona; o Firestore Security Rules é
  //      quem faz a checagem de verdade do lado do servidor — ver nota
  //      de regras no fim do arquivo)
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
  // ENVIAR — agora assíncrono (Promise). A checagem de "já existe
  // conversa" (item 1 de canMessage) é feita aqui, lendo o doc antes de
  // decidir bloquear, já que aqui dentro já estamos em contexto async.
  // ===================================================================
  function sendMessage(fromEmail, toEmail, text) {
    const clean = (text || "").trim();
    if (!fromEmail || !toEmail || !clean) return Promise.resolve(null);

    const ref = conversationRef(fromEmail, toEmail);

    return ref.get().then((snap) => {
      const alreadyTalked = snap.exists && snap.data().lastAt;
      const check = canMessage(fromEmail, toEmail);
      if (!alreadyTalked && !check.allowed) {
        return { blocked: true, reason: check.reason };
      }

      const now = Date.now();
      const msg = { from: fromEmail, text: clean.slice(0, 2000), at: now };

      return ref.collection("messages").add(msg).then(() => {
        const prev = snap.exists ? snap.data() : {};
        const prevUnread = prev.unread || {};
        const prevReads = prev.reads || {};

        return ref.set({
          participants: [fromEmail, toEmail],
          lastText: msg.text,
          lastFrom: fromEmail,
          lastAt: now,
          unread: { ...prevUnread, [toEmail]: (prevUnread[toEmail] || 0) + 1 },
          // quem manda já "leu" a própria mensagem
          reads: { ...prevReads, [fromEmail]: now },
        }, { merge: true });
      }).then(() => {
        if (global.ArenaSocial) {
          global.ArenaSocial.notify(toEmail, "✉️", "te enviou uma mensagem", `mensagens.html?user=${encodeURIComponent(fromEmail)}`, fromEmail);
        }
        return msg;
      });
    });
  }

  // ===================================================================
  // MENSAGENS DE UMA CONVERSA — inscrição em tempo real, ordenada da
  // mais antiga pra mais nova (igual ao array antigo). Chame a função
  // de unsubscribe devolvida quando a página/tela for desmontada.
  //
  //   const unsub = ArenaMessages.subscribeMessages(meuEmail, outroEmail, (msgs) => {
  //     renderizarMensagens(msgs);
  //   });
  //   // mais tarde, se precisar: unsub();
  // ===================================================================
  function subscribeMessages(emailA, emailB, callback) {
    return conversationRef(emailA, emailB)
      .collection("messages")
      .orderBy("at", "asc")
      .onSnapshot((snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("ArenaMessages: falha ao escutar mensagens.", err));
  }

  // ===================================================================
  // LISTA DE CONVERSAS — inscrição em tempo real de todas as conversas
  // de `email`, mais recente primeiro, já com `unread` calculado.
  // `resolveFn` (opcional) recebe o e-mail do parceiro e devolve os
  // dados de exibição (nome, avatar, username) — mesma ideia de antes.
  // ===================================================================
  function subscribeConversationList(email, resolveFn, callback) {
    return db.collection("conversations")
      .where("participants", "array-contains", email)
      .onSnapshot((snap) => {
        const list = snap.docs
          .map(d => {
            const data = d.data();
            const partner = data.participants.find(p => p !== email);
            return {
              id: d.id,
              partner,
              lastText: data.lastText,
              lastFrom: data.lastFrom,
              lastAt: data.lastAt,
              unread: (data.unread && data.unread[email]) || 0,
              player: typeof resolveFn === "function" ? resolveFn(partner) : null,
            };
          })
          .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
        callback(list);
      }, (err) => console.warn("ArenaMessages: falha ao escutar lista de conversas.", err));
  }

  // ===== LEITURA — marca como lida (zera unread + atualiza reads) =====
  function markConversationRead(email, partner) {
    const ref = conversationRef(email, partner);
    return ref.get().then((snap) => {
      const prev = snap.exists ? snap.data() : {};
      return ref.set({
        unread: { ...(prev.unread || {}), [email]: 0 },
        reads: { ...(prev.reads || {}), [email]: Date.now() },
      }, { merge: true });
    });
  }

  // ===== TOTAL NÃO LIDAS — soma unread[email] de todas as conversas =====
  function subscribeTotalUnread(email, callback) {
    return db.collection("conversations")
      .where("participants", "array-contains", email)
      .onSnapshot((snap) => {
        const total = snap.docs.reduce((sum, d) => sum + ((d.data().unread || {})[email] || 0), 0);
        callback(total);
      }, (err) => console.warn("ArenaMessages: falha ao escutar total não lidas.", err));
  }

  // Usado pro "✓✓" nas próprias mensagens: compara o horário da
  // mensagem com o último "reads" que o destinatário registrou.
  function subscribeReadReceipt(fromEmail, toEmail, callback) {
    return conversationRef(fromEmail, toEmail).onSnapshot((snap) => {
      const reads = snap.exists ? (snap.data().reads || {}) : {};
      callback(reads[toEmail] || 0);
    }, (err) => console.warn("ArenaMessages: falha ao escutar confirmação de leitura.", err));
  }

  // ===================================================================
  // "DIGITANDO..." — agora de verdade entre contas/dispositivos
  // diferentes (antes só funcionava entre abas do mesmo navegador).
  // setTyping é "fire and forget" — chame a cada tecla digitada (com
  // um debounce simples do lado de quem chama, pra não escrever no
  // Firestore a cada tecla; ex: só a cada ~1s enquanto digita).
  // ===================================================================
  function setTyping(email, partner) {
    conversationRef(email, partner).set({
      typing: { [email]: Date.now() },
    }, { merge: true }).catch(() => { /* silencioso */ });
  }

  // Chamado da perspectiva de quem está OLHANDO a conversa: "o meu
  // parceiro está digitando pra mim agora?". Reavalia o TTL a cada
  // snapshot recebido; como o Firestore não avisa sozinho quando um
  // timestamp "expira" sem nova escrita, quem chama pode combinar isso
  // com um setInterval leve (~1s) na tela de conversa se quiser que o
  // indicador suma sozinho mesmo sem nova mensagem chegando.
  function subscribeTyping(email, partner, callback) {
    return conversationRef(email, partner).onSnapshot((snap) => {
      const typing = snap.exists ? (snap.data().typing || {}) : {};
      const ts = typing[partner];
      callback(!!ts && (Date.now() - ts < TYPING_TTL_MS));
    }, (err) => console.warn("ArenaMessages: falha ao escutar indicador de digitação.", err));
  }

  // ===================================================================
  // BADGE DE NAV — agora se atualiza sozinho (inscrição), não precisa
  // mais ser chamado de novo pra refletir mensagens novas chegando.
  //   ArenaMessages.mountNavBadge("dm-nav-badge", meuEmail)
  // Devolve a função de unsubscribe, caso a página queira parar de
  // escutar em algum momento (opcional — a maioria das páginas do
  // projeto não desmonta nada, então isso é raramente necessário).
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

  // ===================================================================
  // NOTA SOBRE FIRESTORE SECURITY RULES — como agora os dados moram no
  // servidor (não mais isolados no localStorage de cada um), a
  // aplicação de privacidade descrita em canMessage() PRECISA também
  // existir como regra de segurança no Firestore, senão é só uma
  // sugestão de UI que qualquer um pode ignorar direto pela API.
  // Esboço do que a regra da coleção `conversations/{id}/messages`
  // deveria checar: o `request.auth.token.email` de quem escreve tem
  // que estar em `participants` do doc pai, e (se for a primeira
  // mensagem da conversa) valer as mesmas regras 2/3 de canMessage.
  // Posso escrever essas regras (firestore.rules) quando você quiser.
  // ===================================================================
})(window);
