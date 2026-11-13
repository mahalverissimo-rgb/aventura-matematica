// Service worker: guarda o jogo no aparelho para abrir e jogar sem internet.
// A versão no nome do cache faz o aparelho baixar os arquivos novos a cada versão.
const VERSION = "1.5";
const CACHE = `aventura-matematica-v${VERSION}`;
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/main.js", "js/util.js", "js/dom.js", "js/config.js", "js/shapes.js", "js/challenges.js",
  "js/progress.js", "js/audio.js", "js/ui.js", "js/screens.js", "js/game.js", "js/ads.js",
  "js/account.js", "js/cloud.js", "js/cloud-config.js", "js/sync.js", "js/native.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon-32.png",
  "fonts/baloo2.woff", "privacidade.html", "termos.html", "suporte.html", "css/paginas.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aventura-matematica-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Só arquivos do próprio jogo. Supabase (conta) e fontes passam direto.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // Página: tenta a internet (para pegar versão nova) e usa a cópia se estiver sem conexão.
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("index.html", copy));
        return res;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }
  // Demais arquivos: usa a cópia do aparelho e atualiza em segundo plano.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
