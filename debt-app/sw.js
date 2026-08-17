/* عامل الخدمة — تخزين مؤقت للعمل دون اتصال
   السياسة: الشبكة أولًا للملفات الأساسية (حتى تصل التحديثات فورًا ولا تعلق
   نسخة قديمة في ذاكرة الجهاز)، مع الرجوع للنسخة المخزّنة عند انقطاع الاتصال. */
const CACHE = 'tahseel-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/cloud.js',
  './assets/js/store.js',
  './assets/js/sync.js',
  './assets/js/proof.js',
  './assets/js/app.js',
  './assets/img/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return; // الخطوط الخارجية تمر مباشرة

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
