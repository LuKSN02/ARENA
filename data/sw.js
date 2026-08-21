/* ===================================================================
   ARENA — SERVICE WORKER
   Cache do "app shell" pra abrir mais rápido e sobreviver a conexão
   instável/offline. Estratégias por tipo de request:

     - NAVEGAÇÃO (abrir uma página .html)
       network-first → tenta a rede, guarda a resposta no cache, e só
       cai pro cache (ou pro offline.html) se a rede falhar. Assim o
       conteúdo fica sempre atualizado quando há internet, mas o site
       continua funcionando sem ela.

     - ESTÁTICOS DO PRÓPRIO SITE (data/*.js, data/theme.css, manifest)
       cache-first com atualização em segundo plano
       (stale-while-revalidate) — responde na hora com o que já tem
       em cache e atualiza o cache pra próxima visita, sem bloquear a
       resposta atual esperando a rede.

     - TUDO DE FORA (Google Fonts, Tailwind CDN, imagens do Discord/
       placehold.co) — network-first, cacheia se der certo, cai pro
       cache salvo se a rede falhar. Não pré-cacheado (são recursos
       pesados e variam por página), só entra no cache sob demanda.

   IMPORTANTE: sempre que mudar PRECACHE_URLS ou a lógica abaixo, subir
   o CACHE_VERSION — isso invalida o cache antigo nos clientes.
   =================================================================== */
const CACHE_VERSION = "arena-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "index.html", "loja.html", "inventario.html", "jogo.html", "mensagens.html",
  "noticia.html", "perfil.html", "perfil-config.html", "ranking.html",
  "campeonatos.html", "feed.html", "streamers.html", "offline.html", "share-target.html",
  "manifest.json",
  "data/utils.js", "data/profile.js", "data/social.js", "data/messages.js",
  "data/noticias.js", "data/products.js", "data/campeonatos.js", "data/streamers.js",
  "data/theme.css", "data/pwa.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // allSettled (não all) de propósito: se UMA url falhar (ex: página
      // renomeada, ainda não deployada), o resto do app shell continua
      // sendo cacheado normalmente em vez de abortar tudo.
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegação entre páginas.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("offline.html")))
    );
    return;
  }

  const isSameOrigin = new URL(req.url).origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  } else {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});

/* ===================================================================
   PUSH — hoje NADA dispara isso, porque o site não tem backend (é
   tudo simulado em localStorage, como o resto do app). O handler fica
   pronto pro dia que existir um servidor mandando push de verdade via
   VAPID/subscribe — o formato de payload esperado é
   { title, body, link }. A notificação "do sistema" que já funciona
   HOJE (sem backend) é a de data/social.js (watchForSystemNotifications),
   que também usa showNotification, só que disparada localmente.
   =================================================================== */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (err) { /* payload não era JSON */ }
  const title = payload.title || "Arena";
  const options = {
    body: payload.body || "",
    icon: "https://placehold.co/192x192/14171E/FF4655/png?text=A",
    badge: "https://placehold.co/96x96/14171E/FF4655/png?text=A",
    data: { link: payload.link || "index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* ===== CLIQUE NUMA NOTIFICAÇÃO — foca uma aba já aberta na URL certa
   se existir, senão abre uma nova. Vale tanto pra push real (acima)
   quanto pra showSystemNotification local (data/social.js). ===== */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const targetUrl = new URL(link, self.location.origin).href;
      const existing = clientsArr.find((c) => c.url === targetUrl);
      if (existing) return existing.focus();
      const anyClient = clientsArr[0];
      if (anyClient && "navigate" in anyClient) { anyClient.navigate(targetUrl); return anyClient.focus(); }
      return self.clients.openWindow(targetUrl);
    })
  );
});
