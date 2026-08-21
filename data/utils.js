/* ===================================================================
   ARENA — UTILS.JS  (sessão e usuários de volta pro localStorage)

   POR QUÊ: o app tinha sido migrado pra depender do Firebase Auth +
   Firestore (data/firebase-config.js), mas esse arquivo nunca chegou
   a ser criado/configurado — sem ele, `ArenaFirebase` fica undefined,
   `auth`/`db` ficam undefined, e todo login (botão "ENTRAR", cadastro,
   e a página mensagens.html inteira) quebra silenciosamente.

   Enquanto o Firebase não estiver configurado de verdade, este
   arquivo volta a fazer sessão e cadastro de usuário 100% no
   localStorage do navegador — mesma abordagem "demo" de antes da
   migração. A API pública (o objeto `window.ArenaUtils`) continua
   IDÊNTICA em nome e assinatura de função — index.html, mensagens.html,
   social.js e profile.js não precisam de nenhuma alteração.

   LIMITAÇÃO IMPORTANTE: como não há mais backend, uma conta criada
   num navegador só existe NAQUELE navegador (mesma limitação que
   `data/messages.js` já documenta pro localStorage). Pra sincronizar
   contas/mensagens entre dispositivos de verdade, é preciso configurar
   o Firebase (data/firebase-config.js).

   `data/messages.js` (DMs) AINDA depende de `ArenaFirebase.db`
   (Firestore) pra funcionar — este arquivo não mexe nisso. Ou seja:
   login/cadastro/logout já voltam a funcionar com este arquivo, mas
   mensagens.html (Firestore de conversas) só volta a funcionar depois
   de configurar o Firebase ou reverter messages.js também.

   CARREGAR NESTA ORDEM:
     <script src="data/utils.js"></script>
     <script src="data/pwa.js"></script>
     <script src="data/social.js"></script>
     <script src="data/messages.js"></script>
     ...
   (os <script> do Firebase e o data/firebase-config.js podem continuar
   nas páginas sem problema — eles só não são mais usados por este
   arquivo; se firebase-config.js não existir, o navegador só loga um
   404 de rede pra ele, sem impedir o resto de funcionar.)
   =================================================================== */
(function (global) {
  "use strict";

  // ===== STRINGS / FORMATAÇÃO (inalterado) =====
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

  // ===== LATÊNCIA SIMULADA (usado por data/campeonatos.js, data/noticias.js,
  // data/streamers.js) — inalterado. =====
  const DEFAULT_SIMULATED_LATENCY_MS = 450;
  function simulateLatency(value, ms) {
    const delay = typeof ms === "number" ? ms : DEFAULT_SIMULATED_LATENCY_MS;
    return new Promise((resolve) => setTimeout(() => resolve(value), delay));
  }

  // ===== STORAGE GENÉRICO (inalterado) =====
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (err) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* silencioso */ }
  }

  // ===================================================================
  // USUÁRIOS — array único em localStorage, igual ao esquema pré-Firebase.
  //   { email, password, name, createdAt }
  // ===================================================================
  const USERS_KEY = "arena-demo-users";
  const SESSION_KEY = "arena-session";

  function loadUsersRaw() { return readJSON(USERS_KEY, []); }
  function saveUsersRaw(list) { writeJSON(USERS_KEY, list); }

  let usersCache = loadUsersRaw();

  function loadUsers() {
    return usersCache;
  }

  // Mantida (não é mais NO-OP, já que não existe Firestore pra
  // substituir) — grava a lista inteira, igual ao esquema antigo.
  function saveUsers(list) {
    usersCache = Array.isArray(list) ? list : usersCache;
    saveUsersRaw(usersCache);
  }

  function getUserByEmail(email) {
    return Promise.resolve(usersCache.find(u => u.email === email) || null);
  }

  // ===================================================================
  // SESSÃO — localStorage (remember=true) ou sessionStorage
  // (remember=false, só dura a aba/navegador aberto).
  // ===================================================================
  function readStoredSession() {
    try {
      const local = localStorage.getItem(SESSION_KEY);
      if (local) return JSON.parse(local);
    } catch (err) { /* ignora */ }
    try {
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) return JSON.parse(sess);
    } catch (err) { /* ignora */ }
    return null;
  }

  const storedSession = readStoredSession();
  let currentEmail = (storedSession && storedSession.email) || "";

  // Não há mais listener assíncrono de verdade (não existe Firebase),
  // mas toda página já chama getSessionEmail() através de onAuthReady()
  // — mantemos essa função com a mesma assinatura (chama `cb(email)`)
  // pra não precisar tocar em nenhuma outra página. O estado já é
  // conhecido de forma síncrona aqui, então só adiamos pro próximo
  // microtask (equivalente, na prática, a "assim que soubermos").
  function onAuthReady(cb) {
    if (typeof cb !== "function") return;
    Promise.resolve().then(() => cb(currentEmail));
  }

  function getSessionEmail() {
    return currentEmail;
  }

  function emitAuthChanged() {
    global.dispatchEvent(new CustomEvent("arena-auth-changed", { detail: { email: currentEmail } }));
  }

  function persistSession(email, remember) {
    currentEmail = email;
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (err) { /* silencioso */ }
  }

  function clearPersistedSession() {
    currentEmail = "";
    try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* ignora */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignora */ }
  }

  // ===== LOGIN / CADASTRO / LOGOUT =====
  // Mesma assinatura e mesmo formato de retorno que a versão Firebase
  // (Promise resolvendo com `{ user: { email, displayName } }` /
  // rejeitando com um Error que tem `.code`), pra não quebrar o
  // .then(cred => cred.user.email) / .catch(err => err.code) que já
  // existe em index.html.
  function registerUser(email, password, displayName) {
    return new Promise((resolve, reject) => {
      const clean = (email || "").trim().toLowerCase();
      if (!clean || !password) {
        reject(Object.assign(new Error("E-mail e senha são obrigatórios."), { code: "auth/invalid-email" }));
        return;
      }
      if (password.length < 6) {
        reject(Object.assign(new Error("Senha muito curta."), { code: "auth/weak-password" }));
        return;
      }
      if (usersCache.find(u => u.email === clean)) {
        reject(Object.assign(new Error("Já existe uma conta com esse e-mail."), { code: "auth/email-already-in-use" }));
        return;
      }
      const user = { email: clean, password, name: displayName || "", createdAt: Date.now() };
      usersCache = [...usersCache, user];
      saveUsersRaw(usersCache);
      persistSession(clean, true);
      emitAuthChanged();
      resolve({ user: { email: clean, displayName: displayName || "" } });
    });
  }

  function loginUser(email, password, remember) {
    return new Promise((resolve, reject) => {
      const clean = (email || "").trim().toLowerCase();
      const match = usersCache.find(u => u.email === clean && u.password === password);
      if (!match) {
        reject(Object.assign(new Error("E-mail ou senha incorretos."), { code: "auth/invalid-credential" }));
        return;
      }
      persistSession(clean, remember);
      emitAuthChanged();
      resolve({ user: { email: clean, displayName: match.name || "" } });
    });
  }

  function logoutUser() {
    return new Promise((resolve) => {
      clearPersistedSession();
      emitAuthChanged();
      resolve();
    });
  }

  // Sem backend real pra enviar e-mail de verdade — resolve sempre
  // (mesmo comportamento de segurança de antes: nunca revela se o
  // e-mail existe ou não na base).
  function resetPassword(email) {
    return Promise.resolve();
  }

  // Mantidas por compatibilidade de nome com qualquer código antigo
  // que ainda as chame diretamente.
  function setSession(email, remember) {
    persistSession(email, remember !== false);
    emitAuthChanged();
  }
  function clearSession() {
    return logoutUser();
  }

  global.ArenaUtils = {
    // strings / formatação
    escapeHtml, relativeTime, formatCount, simulateLatency,
    // storage genérico
    readJSON, writeJSON,
    // sessão (localStorage)
    getSessionEmail, onAuthReady, registerUser, loginUser, logoutUser, resetPassword,
    setSession, clearSession,
    // usuários (localStorage)
    loadUsers, saveUsers, getUserByEmail,
  };
})(window);
