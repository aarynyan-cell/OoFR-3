// OoFR 3.0 (online AI version) service worker (generated at build time from plugins/sw-template.js).
// It only caches the app's own files. Learning data lives in IndexedDB and is
// never touched here, so an update can never cost the learner their data.
//
// Cache names start with "oofr3-shell-": 1.0's worker deletes every cache that
// starts with "oofr-", 2.0's every older "oofr2-shell-" one, and this worker
// only ever deletes its own older copies. 2.0 and 3.0 share the site
// (aarynyan-cell.github.io), so their caches must never have the same names.
const CACHE_PREFIX = "oofr3-shell-";
const CACHE_NAME = `${CACHE_PREFIX}bbb2332b4f7b`;
// Dictionary shards stay cached across app updates (a different prefix).
const DICTIONARY_CACHE = "oofr3-dictionary";
const DICTIONARY_VERSION = "2026.10.07+zh.2026.10.20.2233";
const ASSETS = [
  "./",
  "./assets/engine.worker-tmtBPNBt.js",
  "./assets/ibm-plex-mono-latin-500-normal-DSY6xOcd.woff2",
  "./assets/ibm-plex-mono-latin-600-normal-BgSNZQsw.woff2",
  "./assets/index-B9pqynn3.js",
  "./assets/index-C7H_7k7F.css",
  "./assets/jsQR-BBJMqLnr.js",
  "./assets/literata-latin-400-normal-CLtNJ872.woff2",
  "./assets/literata-latin-500-normal-Dbph1WrK.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-32.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      // The first worker replaces any earlier one straight away; later updates
      // wait for the learner's "刷新".
      const first = !keys.some((key) => key.startsWith(CACHE_PREFIX));
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS.map((asset) => new Request(asset, { cache: "reload" })));
      if (first) await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => pruneDictionary().catch(() => {}))
      .then(() => self.clients.claim())
  );
});

// The page asks for this after the learner taps "刷新" on the update notice.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Other hosts (a local AI server, dictionaries) always go to the network.
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(openPage(request));
    return;
  }
  if (url.pathname.includes("/dictionary/")) {
    event.respondWith(dictionaryFile(request));
    return;
  }
  event.respondWith(fromCache(request));
});

// Shard addresses carry the dictionary version (?v=…), so a cached shard never
// goes stale: it answers at once and offline, without spending mobile data.
async function dictionaryFile(request) {
  const cache = await caches.open(DICTIONARY_CACHE);
  const cached = await cache.match(request.url, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.status === 200) cache.put(request.url, response.clone()).catch(() => {});
  return response;
}

// Shards of an older dictionary build are dropped once a new one is in use.
async function pruneDictionary() {
  const cache = await caches.open(DICTIONARY_CACHE);
  const requests = await cache.keys();
  await Promise.all(requests.filter((request) => new URL(request.url).searchParams.get("v") !== DICTIONARY_VERSION).map((request) => cache.delete(request)));
}

// Look files up by address only: module scripts and stylesheets are requested
// with an Origin header, and a server that answers "Vary: Origin" would
// otherwise make the cached copy never match.
async function fromCache(request) {
  const cached = await caches.match(request.url, { ignoreSearch: true, ignoreVary: true });
  return cached || fetch(request);
}

// Pages: the cached shell opens instantly and works offline; built files have
// content hashes in their names, so a new version arrives through a new worker.
async function openPage(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = (await cache.match("./index.html")) || (await cache.match("./"));
  if (cached) return cached;
  return fetch(request);
}
