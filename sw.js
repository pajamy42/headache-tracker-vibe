// Migraine Diary service worker: makes the app load instantly and work offline.
// Strategy: serve app files from the cache immediately, refresh them in the background,
// so edits to index.html/app.js are picked up on the next launch without touching this file.
const CACHE = 'migraine-diary-v2';
const FILES = ['./', './index.html', './app.js', './styles.css', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('migraine-diary-') && k !== CACHE) // never touch other apps' caches
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const refresh = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
    return refresh;
  })());
});
