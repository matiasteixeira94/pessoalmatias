// ===========================================================
// SW.JS — service worker do PWA.
//
// Estratégia: cache-first para os estáticos (o app shell inteiro é
// pré-cacheado na instalação), com atualização em segundo plano a
// cada requisição bem-sucedida — assim, na próxima visita, mesmo
// on-line, o usuário já vê a versão em cache instantaneamente e o
// cache se mantém atualizado. Para navegações (troca de página) sem
// rede e sem correspondência exata no cache (ex.: com query string),
// cai no app shell ("/") em vez de mostrar erro do navegador.
//
// Versionamento: mude CACHE_VERSION a cada deploy que altere algum
// arquivo estático — o "activate" apaga caches de versões antigas.
// ===========================================================

const CACHE_VERSION = "gfm-v3";
const CACHE_ESTATICO = `gfm-estatico-${CACHE_VERSION}`;

// Sempre as URLs "limpas" (sem .html) — o vercel.json usa cleanUrls, então
// "/lancamentos.html" 308-redireciona para "/lancamentos". Servir do cache
// uma resposta de navegação que veio de um redirecionamento quebra com
// net::ERR_FAILED no Chrome; pré-cacheando (e linkando, em app.js) direto a
// URL final, sem redirecionamento, o problema não existe.
const ARQUIVOS_PRECACHE = [
  "/",
  "/lancamentos",
  "/orcamento",
  "/relatorios",
  "/categorias",
  "/configuracoes",
  "/manifest.json",
  "/assets/css/reset.css",
  "/assets/css/variaveis.css",
  "/assets/css/componentes.css",
  "/assets/css/principal.css",
  "/assets/js/app.js",
  "/assets/js/db.js",
  "/assets/js/modelos.js",
  "/assets/js/calculos.js",
  "/assets/js/graficos.js",
  "/assets/js/importar-exportar.js",
  "/assets/js/ui.js",
  "/assets/js/formatadores.js",
  "/assets/js/seed.js",
  "/dados/categorias-padrao.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-maskable-192.png",
  "/assets/icons/icon-maskable-512.png",
  "/assets/icons/icon-180.png",
  // Bibliotecas via CDN — best-effort: se alguma falhar (offline na
  // primeira instalação), o resto do app shell continua sendo cacheado.
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) =>
        Promise.allSettled(
          ARQUIVOS_PRECACHE.map((url) =>
            cache.add(url).catch((erro) => console.warn("[sw] Falha ao pré-cachear", url, erro))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE_ESTATICO).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const ehNavegacao = requisicao.mode === "navigate";

  evento.respondWith(
    caches.match(requisicao, { ignoreSearch: ehNavegacao }).then((respostaCache) => {
      if (respostaCache) return respostaCache;

      return fetch(requisicao)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const copia = respostaRede.clone();
            caches.open(CACHE_ESTATICO).then((cache) => cache.put(requisicao, copia));
          }
          return respostaRede;
        })
        .catch(() => (ehNavegacao ? caches.match("/") : undefined));
    })
  );
});
