/* Minimal service worker. It exists only so browsers treat OmniDesk as an
   installable app; it intentionally caches nothing, because every view needs a
   live Supabase session. If offline support is ever added, this is the file to
   replace with a real fetch strategy. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
