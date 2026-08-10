/* ===================================================================
   ARENA — UTILS.JS
   Helpers compartilhados por TODA página do site. Antes cada página
   tinha sua própria cópia de escapeHtml/relativeTime/readJSON/etc —
   isso virou fonte de bugs (ex: getSessionEmail() em outras páginas
   não respeitava o "manter conectado" de index.html, então quem
   fechava o navegador e voltava direto pra loja.html ou ranking.html
   aparecia deslogado mesmo com a sessão lembrada válida).

   Carregar ANTES de social.js e de qualquer outro <script src="data/...">
   nas páginas:
     <script src="data/utils.js"></script>
     <script src="data/social.js"></script>

   Uso em qualquer página (destructuring do que for precisar):
     const { escapeHtml, getSessionEmail, readJSON, writeJSON } = window.ArenaUtils;
   =================================================================== */
(function (global) {
  "use strict";

  // ===== CHAVES DE STORAGE =====
  const SESSION_KEY = "arena-session-email";     // sessionStorage — dura a aba
  const REMEMBER_KEY = "arena-remembered-session"; // localStorage — "manter conectado"
  const USERS_KEY = "arena-demo-users";
  const REMEMBER_DAYS = 30;

  let usersFallback = []; // usado só se o localStorage estiver bloqueado

  // ===== STRINGS / FORMATAÇÃO =====
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function relativeTime(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `há ${d}d`;
    const mo = Math.floor(d / 30);
    return `há ${mo}${mo === 1 ? " mês" : " meses"}`;
  }

  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
    return String(n);
  }

  // ===== STORAGE GENÉRICO (localStorage) =====
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (err) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* silencioso */ }
  }

  // ===== "BANCO" DE USUÁRIOS (localStorage) =====
  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return usersFallback;
    }
  }
  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (err) {
      usersFallback = users;
    }
  }

  // ===== SESSÃO =====
  // Por padrão vive só no sessionStorage (dura a aba). Se a pessoa
  // marcar "Manter conectado" no login, também guardamos uma cópia
  // persistente no localStorage com validade de 30 dias — ao reabrir
  // o navegador em QUALQUER página do site, getSessionEmail() recupera
  // essa cópia e "espelha" de volta pro sessionStorage da aba atual.
  function setSession(email, remember) {
    try { sessionStorage.setItem(SESSION_KEY, email); } catch (err) { /* silencioso */ }
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, expiresAt: Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000 }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err) { /* silencioso */ }
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* silencioso */ }
    try { localStorage.removeItem(REMEMBER_KEY); } catch (err) { /* silencioso */ }
  }

  function getSessionEmail() {
    try {
      const fromTab = sessionStorage.getItem(SESSION_KEY);
      if (fromTab) return fromTab;
    } catch (err) { /* silencioso */ }
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return "";
      const data = JSON.parse(raw);
      if (!data.expiresAt || data.expiresAt < Date.now()) {
        localStorage.removeItem(REMEMBER_KEY);
        return "";
      }
      try { sessionStorage.setItem(SESSION_KEY, data.email); } catch (err) { /* silencioso */ }
      return data.email || "";
    } catch (err) { return ""; }
  }

  global.ArenaUtils = {
    // chaves (caso alguma página precise montar outra chave derivada)
    SESSION_KEY, REMEMBER_KEY, USERS_KEY, REMEMBER_DAYS,
    // strings / formatação
    escapeHtml, relativeTime, formatCount,
    // storage genérico
    readJSON, writeJSON,
    // usuários
    loadUsers, saveUsers,
    // sessão
    getSessionEmail, setSession, clearSession,
  };
})(window);
