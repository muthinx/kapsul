// ==========================================
// SERVICE WORKER UNTUK APLIKASI "Kapsul"
// Versi: 1.0.0
// ==========================================

const CACHE_NAME = 'kapsul-shell-v1';

// ==========================================
// DAFTAR ASSET YANG DI-CACHE SAAT INSTALL
// ==========================================
const ASSETS_TO_CACHE = [
  // Root & HTML
  '/kapsul/',
  '/kapsul/index.html',

  // CSS (Global, Layout, Komponen)
  '/kapsul/src/css/style.css',
  '/kapsul/src/css/layout.css',
  '/kapsul/src/css/components.css',

  // Core JavaScript (Entry Point & Router)
  '/kapsul/src/js/main.js',
  '/kapsul/src/js/router.js',
  '/kapsul/src/js/firebase-init.js',

  // Firebase SDK (dari Import Map)
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js',

  // Font Awesome (Ikon)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',

  // File manifest (agar splash screen tetap muncul offline)
  '/kapsul/manifest.json'
];

// ==========================================
// EVENT INSTALL
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Meng-cache asset shell Kapsul...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Memaksa SW baru untuk langsung aktif tanpa menunggu halaman ditutup
        return self.skipWaiting();
      })
  );
});

// ==========================================
// EVENT ACTIVATE
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Hapus cache versi lama jika ada
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Menghapus cache lama:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Mengambil kendali penuh atas semua halaman yang terbuka
        return self.clients.claim();
      })
  );
});

// ==========================================
// EVENT FETCH (Mencegat Semua Permintaan)
// ==========================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ==========================================
  // STRATEGI 1: NAVIGASI (Mode = Navigate)
  // ==========================================
  // Saat user refresh atau membuka link, kirimkan index.html dari cache.
  // Ini adalah KUNCI agar SPA injector bebas 404 di GitHub Pages.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((cachedFile) => {
          if (cachedFile) {
            return cachedFile;
          }
          // Fallback ke jaringan jika cache gagal (misal pertama kali)
          return fetch(request);
        })
    );
    return;
  }

  // ==========================================
  // STRATEGI 2: STATIC ASSETS (Cache First)
  // ==========================================
  // Untuk CSS, JS, dan ikon, cari di cache dulu.
  // Jika tidak ada, ambil dari jaringan dan simpan ke cache untuk nanti.
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Jika ada di cache, langsung kirim (SANGAT CEPAT)
            return cachedResponse;
          }

          // Jika tidak ada, ambil dari jaringan
          return fetch(request)
            .then((networkResponse) => {
              // Simpan hasil fetch ke cache untuk permintaan berikutnya
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              // Jika offline dan tidak ada cache, beri fallback (opsional)
              // Misal untuk gambar rusak, kita bisa kembalikan placeholder nanti.
            });
        })
    );
    return;
  }

  // ==========================================
  // STRATEGI 3: API & FIRESTORE (Network First)
  // ==========================================
  // Untuk data (seperti Firestore), kita usahakan selalu ambil dari jaringan
  // agar data real-time. SW tidak perlu meng-cache data Firestore karena
  // Firebase SDK sudah punya mekanisme offline persistence sendiri.
  // Tapi kita tetap biarkan request ini lewat tanpa intervensi.
  // Jika memang ingin di-cache, bisa ditambahkan, tapi untuk aplikasi diary
  // lebih baik data selalu fresh dari network.
  event.respondWith(
    fetch(request).catch(() => {
      // Jika gagal total, coba kembalikan response kosong atau error.
      // Firebase akan menangani offline-nya sendiri via enablePersistence().
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});
