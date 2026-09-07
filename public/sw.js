// Minimal service worker: passthrough fetch handler only.
// Exists to satisfy PWA install criteria (Chrome requires a fetch handler).
// No caching — the app always loads fresh data from Supabase.
self.addEventListener('fetch', () => {});
