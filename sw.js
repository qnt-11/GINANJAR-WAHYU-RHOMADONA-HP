// =========================================================
// GANTI NAMA VERSI INI SETIAP KALI KAMU MENGUBAH KODE INDEX.HTML
// Contoh: Jika besok kamu merubah warna tombol, ubah menjadi 'uanga-cache-v3.1'
// =========================================================
const CACHE_NAME = 'uanga-cache-v3.0';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// 1. PROSES INSTALL: Menyimpan file dasar dan MEMAKSA UPDATE
self.addEventListener('install', event => {
  // skipWaiting() memaksa Service Worker baru untuk langsung aktif 
  // tanpa menunggu user menutup aplikasi. Inilah kunci "Auto-Update".
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Menyimpan Cache Aplikasi');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. PROSES AKTIVASI: Membersihkan sampah versi lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika ada cache dengan nama versi lama, HAPUS!
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus Cache Lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // clients.claim() memastikan Service Worker baru langsung mengontrol halaman saat ini
  self.clients.claim();
});

// 3. PROSES FETCH (MENGAMBIL DATA): Strategi "Network-First"
self.addEventListener('fetch', event => {
  // PENGECUALIAN MUTLAK: Jangan pernah meng-cache link Google Sheets kita!
  if (event.request.url.includes('script.google.com')) {
    return; 
  }

  event.respondWith(
    // Langkah 1: Selalu coba ambil file terbaru dari internet (Server/Hosting)
    fetch(event.request)
      .then(response => {
        // Jika berhasil dapat yang baru dari internet, perbarui cache diam-diam
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response; // Tampilkan yang terbaru ke layar
      })
      .catch(() => {
        // Langkah 2: Jika gagal (HP sedang Offline/Tidak ada sinyal internet),
        // barulah ambil file dari memori cache.
        return caches.match(event.request);
      })
  );
});
