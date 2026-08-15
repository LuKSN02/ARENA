/* ===================================================================
   ARENA — SOCIAL.JS
   Módulo compartilhado de notificações. Carregado em toda página que
   tenha o header padrão (bloco #nav-desktop / #site-header).

   Storage: `arena-notifications-<email>` guarda uma lista (mais nova
   primeiro) de objetos:
     { id, icon, text, link, at, read }

   Uso em qualquer página:
     ArenaSocial.notify(destinatarioEmail, "❤️", "fulano curtiu seu recado", "perfil.html?user=...");
     ArenaSocial.unreadCount(email);
     ArenaSocial.mountBell({ email, buttonEl, dropdownEl });
   =================================================================== */
(function (global) {
  "use strict";

  // Requer data/utils.js carregado ANTES deste script.
  if (!global.ArenaUtils) {
    console.error("ArenaSocial: data/utils.js precisa ser carregado antes de data/social.js");
  }
  const { readJSON, writeJSON, escapeHtml, relativeTime } = global.ArenaUtils || {};

  function key(email) { return `arena-notifications-${email || "demo"}`; }

  function getAll(email) { return readJSON(key(email), []); }

  function unreadCount(email) {
    return getAll(email).filter(n => !n.read).length;
  }

  // Cria uma notificação para `toEmail`. Não notifica a própria conta
  // (evita "você seguiu você mesmo" ou eco de ações próprias).
  function notify(toEmail, icon, text, link, fromEmail) {
    if (!toEmail) return;
    if (fromEmail && fromEmail === toEmail) return;
    try {
      const list = getAll(toEmail);
      list.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        icon, text, link: link || null,
        at: Date.now(), read: false,
      });
      writeJSON(key(toEmail), list.slice(0, 50));
    } catch (err) { /* silencioso */ }
  }

  function markAllRead(email) {
    const list = getAll(email).map(n => ({ ...n, read: true }));
    writeJSON(key(email), list);
  }

  function markOneRead(email, id) {
    const list = getAll(email).map(n => n.id === id ? { ...n, read: true } : n);
    writeJSON(key(email), list);
  }

  function clearAll(email) {
    writeJSON(key(email), []);
  }

  // ===================================================================
  // UI — sino + dropdown. Injeta o comportamento em elementos que já
  // existem no HTML da página (você cria o botão/ícone e o dropdown
  // vazio; esta função só popula e liga os eventos).
  //   opts.email        — e-mail da sessão atual
  //   opts.buttonEl      — elemento clicável (o sino)
  //   opts.dropdownEl    — container do dropdown (começa hidden)
  //   opts.badgeEl       — pequeno elemento pra mostrar contagem (opcional)
  //   opts.listEl        — onde a lista de notificações é renderizada
  // ===================================================================
  function mountBell(opts) {
    const { email, buttonEl, dropdownEl, badgeEl, listEl } = opts;
    if (!buttonEl || !dropdownEl || !listEl) return;

    function render() {
      const items = getAll(email);
      const unread = items.filter(n => !n.read).length;

      if (badgeEl) {
        if (unread > 0) {
          badgeEl.textContent = unread > 9 ? "9+" : String(unread);
          badgeEl.classList.remove("hidden");
        } else {
          badgeEl.classList.add("hidden");
        }
      }

      if (items.length === 0) {
        listEl.innerHTML = `<p class="arena-notif-empty">Nenhuma notificação ainda.</p>`;
        return;
      }

      listEl.innerHTML = items.slice(0, 20).map(n => `
        <a href="${n.link ? escapeHtml(n.link) : "#"}" class="arena-notif-row ${n.read ? "" : "is-unread"}" data-id="${n.id}">
          <span class="arena-notif-icon">${n.icon || "🔔"}</span>
          <span class="arena-notif-body">
            <span class="arena-notif-text">${escapeHtml(n.text)}</span>
            <span class="arena-notif-time">${relativeTime(n.at)}</span>
          </span>
        </a>`).join("");

      listEl.querySelectorAll(".arena-notif-row").forEach(row => {
        row.addEventListener("click", () => {
          markOneRead(email, row.dataset.id);
        });
      });
    }

    buttonEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = dropdownEl.classList.contains("hidden");
      dropdownEl.classList.toggle("hidden");
      buttonEl.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        render();
        // pequeno delay pra não marcar tudo como lido instantaneamente
        // e sumir o badge antes do usuário ver o que chegou
        setTimeout(() => { markAllRead(email); render(); }, 1200);
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdownEl.classList.contains("hidden") && !dropdownEl.contains(e.target) && e.target !== buttonEl) {
        dropdownEl.classList.add("hidden");
      }
    });

    render();
    return { render };
  }

  // ===================================================================
  // REAÇÕES — reação rápida (emoji) em qualquer item (recado de mural,
  // comentário de notícia, etc). Guardadas num único objeto global
  // `arena-reactions`, indexado por um itemId que cada página escolhe
  // (ex: `wall-<id>`, `comment-<id>`) pra nunca colidir entre si:
  //   { [itemId]: { "🔥": ["email1","email2"], "👍": [...] } }
  // ===================================================================
  const REACTIONS_KEY = "arena-reactions";
  const DEFAULT_EMOJIS = ["🔥", "👍", "❤️", "😂", "💀"];

  function getAllReactions() { return readJSON(REACTIONS_KEY, {}); }

  function getItemReactions(itemId) {
    return getAllReactions()[itemId] || {};
  }

  // Alterna a reação `emoji` de `email` no item `itemId`. Retorna true
  // se a reação foi ADICIONADA agora (false se foi removida).
  function toggleReaction(itemId, emoji, email) {
    if (!email) return false;
    const all = getAllReactions();
    if (!all[itemId]) all[itemId] = {};
    if (!all[itemId][emoji]) all[itemId][emoji] = [];
    const list = all[itemId][emoji];
    const idx = list.indexOf(email);
    if (idx >= 0) list.splice(idx, 1); else list.push(email);
    if (list.length === 0) delete all[itemId][emoji];
    writeJSON(REACTIONS_KEY, all);
    return idx < 0;
  }

  // Monta a barra de reações dentro de `containerEl`. Chamar de novo
  // (ex: depois de re-renderizar a lista) é seguro — ela substitui o
  // conteúdo do container a cada chamada.
  //   opts.itemId, opts.email, opts.containerEl, opts.emojis (opcional)
  //   opts.onReact(emoji, added) — callback opcional (ex: pra notificar
  //   o autor do item quando alguém reage)
  function mountReactions(opts) {
    const { itemId, email, containerEl, emojis = DEFAULT_EMOJIS, onReact } = opts;
    if (!containerEl) return;

    function render() {
      const reactions = getItemReactions(itemId);
      containerEl.innerHTML = emojis.map(emoji => {
        const list = reactions[emoji] || [];
        const active = email && list.includes(email);
        return `<button type="button" class="arena-reaction-btn ${active ? "is-active" : ""}" data-emoji="${emoji}">
          <span>${emoji}</span>${list.length > 0 ? `<span class="arena-reaction-count">${list.length}</span>` : ""}
        </button>`;
      }).join("");

      containerEl.querySelectorAll(".arena-reaction-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          if (!email) return;
          const emoji = btn.dataset.emoji;
          const added = toggleReaction(itemId, emoji, email);
          render();
          if (typeof onReact === "function") onReact(emoji, added);
        });
      });
    }

    render();
    return { render };
  }

  // ===================================================================
  // NOTIFICAÇÃO DO SISTEMA — quando surge uma notificação nova em
  // arena-notifications-<email> enquanto a aba está em segundo plano,
  // mostra também uma notificação do SO (via service worker), pra não
  // passar despercebida. NÃO é push de verdade — como o site não tem
  // backend, isso só pega notificação que já foi escrita nesse MESMO
  // navegador (mesma limitação documentada em data/messages.js pro
  // "digitando..."). Ainda assim é útil: cobre o caso comum de "tenho
  // duas abas da Arena abertas, uma de cada conta" ou "troquei de aba
  // pra outro site e a Arena continua registrando coisa em segundo
  // plano". Requer permissão concedida via ArenaPWA.requestNotificationPermission().
  // ===================================================================
  function showSystemNotification(n) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification("Arena", {
        body: n.text,
        icon: "https://placehold.co/192x192/14171E/FF4655/png?text=A",
        badge: "https://placehold.co/96x96/14171E/FF4655/png?text=A",
        tag: n.id,
        data: { link: n.link || "index.html" },
      });
    }).catch(() => { /* silencioso — SO sem suporte ou registro ainda não pronto */ });
  }

  const SYSTEM_NOTIF_POLL_MS = 5000;
  function watchForSystemNotifications(email) {
    if (!email) return;
    let lastSeenIds = new Set(getAll(email).map(n => n.id));
    setInterval(() => {
      if (!document.hidden) { lastSeenIds = new Set(getAll(email).map(n => n.id)); return; }
      const current = getAll(email);
      current.filter(n => !lastSeenIds.has(n.id)).forEach(showSystemNotification);
      lastSeenIds = new Set(current.map(n => n.id));
    }, SYSTEM_NOTIF_POLL_MS);
  }

  // ===================================================================
  // HEADER BELL — monta o sino + dropdown dentro de um container vazio
  // (`<div id="notif-wrap" class="hidden"></div>` no header da página),
  // em vez de exigir que cada página copie o markup/CSS do botão e do
  // dropdown. Uso (uma linha, no script da página, com a sessão já
  // resolvida via ArenaUtils.getSessionEmail()):
  //
  //   ArenaSocial.initHeaderBell();
  //
  // Não faz nada se não houver sessão ativa ou se o container não
  // existir na página (páginas sem sino, como jogo.html/noticia.html,
  // simplesmente ignoram a chamada). Retorna o mesmo objeto de
  // mountBell({ render }) pra quem precisar re-renderizar manualmente,
  // ou null se não montou.
  // ===================================================================
  function initHeaderBell(opts) {
    const { email, containerId = "notif-wrap" } = opts || {};
    const utils = global.ArenaUtils;
    const resolvedEmail = email || (utils && utils.getSessionEmail());
    const wrap = document.getElementById(containerId);
    if (!resolvedEmail || !wrap) return null;

    wrap.classList.remove("hidden");
    wrap.classList.add("sm:block");
    wrap.innerHTML = `
      <button id="notif-btn" aria-label="Notificações" aria-haspopup="true" aria-expanded="false" class="w-9 h-9 flex items-center justify-center text-[14px] arena-notif-btn">
        🔔
        <span id="notif-badge" class="hidden arena-notif-badge"></span>
      </button>
      <div id="notif-dropdown" class="hidden arena-notif-dropdown" role="menu">
        <div class="arena-notif-header">NOTIFICAÇÕES</div>
        <div id="notif-list"></div>
      </div>`;

    const mounted = mountBell({
      email: resolvedEmail,
      buttonEl: wrap.querySelector("#notif-btn"),
      dropdownEl: wrap.querySelector("#notif-dropdown"),
      badgeEl: wrap.querySelector("#notif-badge"),
      listEl: wrap.querySelector("#notif-list"),
    });
    watchForSystemNotifications(resolvedEmail);
    return mounted;
  }

  global.ArenaSocial = {
    notify, getAll, unreadCount, markAllRead, markOneRead, clearAll, mountBell, initHeaderBell, relativeTime,
    getItemReactions, toggleReaction, mountReactions,
    watchForSystemNotifications,
  };
})(window);
