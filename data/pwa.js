/* ===================================================================
   ARENA — PWA.JS
   Módulo compartilhado que:
     1) registra o Service Worker (sw.js), habilitando cache do app
        shell e uso offline;
     2) guarda o evento `beforeinstallprompt` do navegador e expõe um
        jeito simples de qualquer página oferecer um botão "Instalar
        app" — basta ter um elemento com a classe `.js-pwa-install`
        (hoje usado no botão 📲 do header de index.html). O botão fica
        escondido por padrão e só aparece quando o navegador realmente
        permite instalar (ou some de novo se já estiver instalado).

   Carregar perto dos outros módulos data/*.js, em qualquer página:
     <script src="data/pwa.js"></script>
   =================================================================== */
(function (global) {
  "use strict";

  // ===== SERVICE WORKER =====
  if ("serviceWorker" in navigator) {
    global.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Arena: falha ao registrar o service worker.", err);
      });
    });
  }

  // ===== PROMPT DE INSTALAÇÃO =====
  // O navegador dispara esse evento só quando já considera o site
  // "instalável" (manifest válido + service worker ativo). Guardamos
  // o evento pra poder chamar .prompt() depois, no clique do usuário —
  // navegadores exigem que a instalação seja iniciada por uma ação
  // direta da pessoa, não pode disparar sozinho.
  let deferredInstallPrompt = null;

  global.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.querySelectorAll(".js-pwa-install").forEach((el) => el.classList.remove("hidden"));
  });

  global.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    document.querySelectorAll(".js-pwa-install").forEach((el) => el.classList.add("hidden"));
  });

  function promptInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
  }

  // ===== NOTIFICAÇÕES DO SISTEMA =====
  // IMPORTANTE: isso não é push de verdade — o site não tem backend
  // pra disparar notificação remotamente (a limitação é a mesma já
  // documentada em data/messages.js pro "digitando..." e pras
  // conversas: tudo vive no localStorage do navegador, sem servidor).
  // O que isso liga é a permissão do SO + o service worker pronto pra
  // exibir notificações — quem efetivamente dispara uma quando surge
  // algo novo é o `watchForSystemNotifications` de data/social.js.
  // Isso deixa a infraestrutura pronta pro dia que existir um backend
  // real de push (VAPID/subscribe) — só falta o servidor.
  //
  // Qualquer página pode oferecer o botão de ativar, igual ao botão
  // de instalar: <button class="js-notif-enable hidden">🔔 Ativar notificações</button>
  function notificationsSupported() {
    return "Notification" in global && "serviceWorker" in navigator;
  }

  function updateNotifButtonVisibility() {
    const show = notificationsSupported() && Notification.permission === "default";
    document.querySelectorAll(".js-notif-enable").forEach((el) => el.classList.toggle("hidden", !show));
  }

  function requestNotificationPermission() {
    if (!notificationsSupported()) return;
    Notification.requestPermission().finally(updateNotifButtonVisibility);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".js-pwa-install")) promptInstall();
    if (e.target.closest(".js-notif-enable")) requestNotificationPermission();
  });

  if (notificationsSupported()) {
    document.addEventListener("DOMContentLoaded", updateNotifButtonVisibility);
  }

  global.ArenaPWA = { promptInstall, requestNotificationPermission, notificationsSupported };
})(window);
