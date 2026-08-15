// ===========================================================
// SW.JS — service worker.
//
// STUB (Fase 1): a estratégia de cache (cache-first para os
// estáticos, versionamento com CACHE_VERSION e limpeza de caches
// antigos no "activate") e o registro deste worker nas páginas
// serão implementados na Fase 4, junto com o restante do PWA.
// ===========================================================

const CACHE_VERSION = "gfm-v0";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});
