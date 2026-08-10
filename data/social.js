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

  global.ArenaSocial = {
    notify, getAll, unreadCount, markAllRead, markOneRead, clearAll, mountBell, relativeTime,
    getItemReactions, toggleReaction, mountReactions,
  };
})(window);
