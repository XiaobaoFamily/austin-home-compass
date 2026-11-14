const CACHE = 'home-compass-shell-v1';
const ROOT = new URL('./', self.location.href);
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([ROOT.href, new URL('icon-192.png', ROOT).href])));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('home-compass-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req = event.request, url = new URL(req.url);
 // Cache only public same-origin application assets. Never cache Supabase/auth/personal API responses.
 if(req.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
 if(req.mode === 'navigate') {
  event.respondWith(fetch(req).then(response => {
   if(response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(c => c.put(ROOT.href, copy))); }
   return response;
  }).catch(() => caches.match(ROOT.href)));
 } else if(/\.(js|css|png|svg|webmanifest)$/.test(url.pathname)) {
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
   if(response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); }
   return response;
  })));
 }
});
