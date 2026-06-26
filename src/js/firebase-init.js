// ==========================================
// FIREBASE INIT - KAPSUL
// Menggunakan Modular SDK v9+ (Compat)
// ==========================================

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

// ==========================================
// 1. KONFIGURASI FIREBASE (WAJIB DIGANTI)
// ==========================================
// Ambil data ini dari Firebase Console:
// Project Settings -> Your apps -> Config
// JANGAN pernah commit config ini ke repo publik tanpa proteksi,
// tapi karena ini SPA, config ini memang harus ada di client.
// Yang melindungi data adalah Security Rules (firestore.rules)!
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyC2T-LYK7e8orP-7W35pF-Tfohflf4SXL8",
  authDomain: "kapsul-6bf7b.firebaseapp.com",
  projectId: "kapsul-6bf7b",
  storageBucket: "kapsul-6bf7b.firebasestorage.app",
  messagingSenderId: "271987562493",
  appId: "1:271987562493:web:0ddde132f6079359742b94"
};

// ==========================================
// 2. INISIALISASI APLIKASI
// ==========================================
const app = initializeApp(firebaseConfig);

// ==========================================
// 3. INISIALISASI AUTHENTICATION
// ==========================================
const auth = getAuth(app);

// Set persistence ke LOCAL (agar sesi tetap terjaga meskipun browser ditutup)
// Ini penting agar user tidak perlu login ulang setiap kali buka aplikasi.
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('[Firebase] Auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('[Firebase] Gagal set persistence:', error);
  });

// ==========================================
// 4. INISIALISASI FIRESTORE DENGAN OFFLINE CACHE
// ==========================================
// Kunci PWA: persistentLocalCache menyimpan data di IndexedDB
// sehingga semua diary dan todo bisa diakses & ditulis saat offline.
// CACHE_SIZE_UNLIMITED memastikan tidak ada batasan kuota cache.
// ==========================================

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

console.log('[Firebase] Firestore initialized with persistent offline cache');

// ==========================================
// 5. EKSPOR UNTUK DIGUNAKAN DI SELURUH APLIKASI
// ==========================================
export { app, auth, db };