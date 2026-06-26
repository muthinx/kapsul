📝 Kapsul
buat harimu lebih berarti
Jurnal pribadi dengan nuansa media sosial. Catat diary, to-do list, habit, dan tulisan panjangmu dalam satu aplikasi yang terasa seperti media sosial—tapi untuk diri sendiri.

🌟 Fitur Utama
Menu	Deskripsi
📊 Dashboard	Halaman utama berisi "Kegiatan Sekarang" + timeline harian dari diary dan todo yang selesai
📖 Diary	Jurnal pribadi dengan mood, cuaca, dan refleksi (mirip thread Twitter)
✅ To-Do List	Checklist dengan tab Hari Ini, Mendatang, dan Selesai. Tugas urgent muncul di Dashboard
✍️ Tulisan	Blog pribadi dengan status Draft / Published. Tulis pemikiran panjangmu
🔥 Habit	Heatmap kebiasaan 5 minggu + streak counter. Maksimal 5 habit aktif
🛠️ Tech Stack
Teknologi	Kegunaan
Firebase Auth	Login Email/Password + Google
Firestore	Database real-time dengan offline persistence
Vanilla JS (ES Modules)	Tanpa framework, murni JavaScript
Service Worker	PWA offline support
GitHub Pages	Hosting gratis
📁 Struktur Proyek
text
/
├── index.html              # Satu-satunya HTML (shell aplikasi)
├── manifest.json           # Konfigurasi PWA
├── sw.js                   # Service Worker
├── firebase.json           # Konfigurasi Firebase (rules & indexes)
├── firestore.rules         # Security Rules (hanya user sendiri yang akses data)
├── firestore.indexes.json  # Index Firestore
├── .nojekyll               # File penting untuk GitHub Pages
│
├── assets/
│   ├── icons/              # Ikon PWA (192x192, 512x512, favicon)
│   └── images/             # Gambar statis (avatar default, dll)
│
├── src/
│   ├── css/
│   │   ├── style.css       # Variabel, reset, tipografi dasar
│   │   ├── layout.css      # Grid 3 kolom (sidebar | konten | panel kanan)
│   │   └── components.css  # Semua komponen UI (card, todo, habit, modal, dll)
│   │
│   ├── js/
│   │   ├── main.js         # Entry point (auth state, login, logout)
│   │   ├── router.js       # Navigasi SPA + dynamic import halaman
│   │   └── firebase-init.js # Inisialisasi Firebase (Auth + Firestore)
│   │
│   ├── pages/
│   │   ├── dashboard.js    # Halaman utama
│   │   ├── diary.js        # Halaman jurnal
│   │   ├── todo.js         # Halaman to-do list
│   │   ├── tulisan.js      # Halaman blog pribadi
│   │   └── habit.js        # Halaman kebiasaan
│   │
│   ├── components/
│   │   ├── diary-card.js   # Kartu diary (reusable)
│   │   ├── todo-item.js    # Item to-do (reusable + grouping utility)
│   │   ├── habit-grid.js   # Grid heatmap habit (reusable)
│   │   └── loader.js       # Loader + skeleton
│   │
│   └── utils/
│       ├── date-helper.js  # Fungsi tanggal (opsional)
│       └── dom-helper.js   # DOM utilities (opsional)
│
└── README.md               # Dokumentasi proyek
🚀 Cara Menjalankan
1. Clone Repository
bash
git clone https://github.com/username/kapsul.git
cd kapsul
2. Setup Firebase
Buat project di Firebase Console

Aktifkan Authentication (Email/Password + Google)

Buat Firestore Database di mode produksi

Ambil config dari Project Settings → Your apps → Config

Ganti firebaseConfig di src/js/firebase-init.js:

javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
3. Deploy Security Rules
bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
4. Deploy ke GitHub Pages
Push ke repository GitHub

Aktifkan GitHub Pages di Settings → Pages → Branch: main

Buka https://username.github.io/kapsul

📱 PWA (Progressive Web App)
Install di Android: Buka Chrome → menu → "Install app"

Install di iOS: Buka Safari → Share → "Add to Home Screen"

Offline Support: Service Worker menyimpan shell dan data di cache

🔒 Keamanan Data
Setiap user hanya bisa membaca/menulis data sendiri (diatur di firestore.rules)

Login wajib menggunakan Email/Password atau Google

Firebase Security Rules memastikan isolasi data antar user

🧪 Testing
Unit Testing (Manual)
Login/Register (Email + Google)

CRUD Diary (tambah, edit, hapus, filter)

CRUD To-Do (tambah, edit, toggle, hapus, filter tab)

CRUD Habit (tambah, edit, hapus, toggle hari)

CRUD Tulisan (tambah, edit, hapus, publish/unpublish, filter)

Dashboard (statistik, kegiatan sekarang, timeline)

Responsive (Desktop 3 kolom → Mobile bottom nav)

🐛 Bug yang Diketahui
Bug	Status	Solusi
-	-	-
📝 Catatan Penting
Firebase Config boleh ditampilkan di client (ini normal untuk SPA). Keamanan data dijamin oleh Security Rules.

IndexedDB digunakan untuk offline cache (data Firestore tetap tersimpan lokal).

Service Worker akan meng-cache shell (index.html, CSS, JS) pada kunjungan pertama.

🤝 Kontribusi
Fork repository

Buat branch fitur: git checkout -b fitur-baru

Commit perubahan: git commit -m 'Tambahkan fitur X'

Push: git push origin fitur-baru

Buat Pull Request

📄 Lisensi
MIT License

🏆 Kredit
Dibuat dengan ❤️ oleh [Nama Anda]

🌐 Live Demo
https://username.github.io/kapsul

Kapsul — buat harimu lebih berarti

