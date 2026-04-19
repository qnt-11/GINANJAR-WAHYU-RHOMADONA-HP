/**
 * SERVICE WORKER uanga famBARLA (VERSI FINAL ABSOLUT + VISUAL FIX)
 * Fitur: Cache Splitting, Stale-While-Revalidate, Anti-Self-Caching, Safe Response Check, Font Caching.
 */

// =========================================================
// ⚠️ PENTING: GANTI ANGKA INI SETIAP ADA UPDATE DI APLIKASI
// Ubah angka ini (misal ke '3.4') jika besok kamu merubah index.html
// =========================================================
const APP_VERSION = '3.3'; 

// Pemisahan Brankas Memori
const CACHE_STATIC = 'uanga-static-v' + APP_VERSION;
const CACHE_DYNAMIC = 'uanga-dynamic-v' + APP_VERSION;

// BRANKAS STATIS: File besar eksternal & CSS
const staticAssets = [
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// BRANKAS DINAMIS: File utama aplikasi
const dynamicAssets = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALASI: Menyimpan data awal & Memaksa Update (Auto-Pilot)
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => cache.addAll(staticAssets)),
      caches.open(CACHE_DYNAMIC).then(cache => cache.addAll(dynamicAssets))
    ])
  );
});

// 2. AKTIVASI: Petugas Kebersihan Cache Versi Lama
self.addEventListener('activate', event => {
  self.clients.claim(); 
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
            console.log('[Service Worker] Menghapus Cache Lama:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. POLISI LALU LINTAS (SMART FETCHING)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // BUG FIX 1: JALUR EVAKUASI UNTUK SW.JS (Anti Bunuh Diri)
  // Biarkan browser yang mengurus file sw.js, jangan pernah masuk brankas!
  if (requestUrl.pathname.endsWith('sw.js')) {
    return;
  }

  // LOGIKA A: JALUR KHUSUS GOOGLE SHEETS (NETWORK-ONLY)
  if (requestUrl.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // LOGIKA B: BRANKAS STATIS (CACHE-FIRST + PENANGKAP FONT GOOGLE)
  if (staticAssets.some(url => event.request.url.includes(url)) || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          // Simpan jika status 200 (sukses) atau status 0 (Opaque response dari font)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_STATIC).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // LOGIKA C: BRANKAS DINAMIS (STALE-WHILE-REVALIDATE / UPDATE SILUMAN)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Hanya simpan file yang valid (Sukses)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Abaikan error jika HP sedang Offline (Silent fallback).
      });

      // Kembalikan versi cache secepat kilat. Jika cache kosong, tunggu hasil download.
      // Mode Offline Fallback jika mengetik URL manual.
      return cachedResponse || fetchPromise || caches.match('./index.html');
    })
  );
});
