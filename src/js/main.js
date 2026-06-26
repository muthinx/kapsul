// ==========================================
// MAIN.JS - ENTRY POINT APLIKASI KAPSUL
// ==========================================

// ==========================================
// 1. IMPOR MODUL
// ==========================================
import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { navigateTo, initRouter } from './router.js';

// ==========================================
// 2. REFERENSI DOM
// ==========================================
const appShell = document.getElementById('app');
const bottomNav = document.getElementById('bottom-nav');
const authContainerId = 'auth-container';

// ==========================================
// 3. FUNGSI MENAMPILKAN / MENYEMBUNYIKAN SHELL
// ==========================================
function showAppShell() {
  // Tampilkan grid 3 kolom
  appShell.style.display = 'grid';
  // Tampilkan bottom nav (khusus mobile)
  bottomNav.style.display = 'flex';
  
  // Hapus container login jika ada
  const existingAuth = document.getElementById(authContainerId);
  if (existingAuth) {
    existingAuth.remove();
  }
}

function hideAppShell() {
  appShell.style.display = 'none';
  bottomNav.style.display = 'none';
}

// ==========================================
// 4. RENDER HALAMAN LOGIN
// ==========================================
function renderAuthPage() {
  // Hapus container login lama jika ada
  const existingAuth = document.getElementById(authContainerId);
  if (existingAuth) {
    existingAuth.remove();
  }

  // Sembunyikan shell
  hideAppShell();

  // Buat container login
  const authContainer = document.createElement('div');
  authContainer.id = authContainerId;
  authContainer.className = 'auth-page';

  // HTML Halaman Login
  authContainer.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">
        <h1 class="brand-name">Kapsul</h1>
        <span class="brand-tagline">buat harimu lebih berarti</span>
      </div>

      <!-- Form Login -->
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label class="form-label" for="login-email">Email</label>
          <input type="email" id="login-email" class="form-input" placeholder="masukkan email" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">Kata Sandi</label>
          <input type="password" id="login-password" class="form-input" placeholder="masukkan kata sandi" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">
          <i class="fas fa-sign-in-alt"></i> <span class="btn-text">Masuk</span>
        </button>
      </form>

      <div class="auth-divider">
        <span>atau</span>
      </div>

      <!-- Tombol Google -->
      <button id="google-login-btn" class="btn-google" style="width:100%;">
        <i class="fab fa-google"></i> <span class="btn-text">Lanjutkan dengan Google</span>
      </button>

      <div class="auth-footer">
        <p>Belum punya akun? <a href="#" id="show-register">Daftar Sekarang</a></p>
      </div>

      <!-- Form Register (disembunyikan awal) -->
      <form id="register-form" class="auth-form hidden">
        <div class="form-group">
          <label class="form-label" for="register-name">Nama Panggilan</label>
          <input type="text" id="register-name" class="form-input" placeholder="nama kamu" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="register-email">Email</label>
          <input type="email" id="register-email" class="form-input" placeholder="masukkan email" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label" for="register-password">Kata Sandi (min. 6 karakter)</label>
          <input type="password" id="register-password" class="form-input" placeholder="buat kata sandi" required minlength="6" autocomplete="new-password">
        </div>
        <button type="submit" class="btn btn-success btn-lg" style="width:100%;">
          <i class="fas fa-user-plus"></i> <span class="btn-text">Daftar</span>
        </button>
        <div class="auth-footer" style="margin-top:0.8rem;">
          <p>Sudah punya akun? <a href="#" id="show-login">Masuk di sini</a></p>
        </div>
      </form>
    </div>
  `;

  // Sisipkan ke body
  document.body.insertBefore(authContainer, appShell);

  // ==========================================
  // 5. REFERENSI ELEMEN (DEKLARASI DI AWAL)
  // ==========================================
  const loginForm = authContainer.querySelector('#login-form');
  const registerForm = authContainer.querySelector('#register-form');
  const googleBtn = authContainer.querySelector('#google-login-btn');
  const showRegisterLink = authContainer.querySelector('#show-register');
  const showLoginLink = authContainer.querySelector('#show-login');

  // ==========================================
  // 6. FUNGSI PEMBANTU LOADING BUTTON
  // ==========================================
  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      const originalText = button.innerHTML;
      button.dataset.originalText = originalText;
      button.innerHTML = '<span class="btn-text">Memproses...</span>';
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  }

  // ==========================================
  // 7. EVENT LISTENERS
  // ==========================================

  // 7a. Login (Email/Password)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    await handleLogin(email, password);
    setButtonLoading(submitBtn, false);
  });

  // 7b. Register (Email/Password)
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    await handleRegister(name, email, password);
    setButtonLoading(submitBtn, false);
  });

  // 7c. Toggle ke Register
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });

  // 7d. Toggle ke Login
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // 7e. Login dengan Google
  googleBtn.addEventListener('click', async () => {
    setButtonLoading(googleBtn, true);
    await handleGoogleLogin();
    setButtonLoading(googleBtn, false);
  });
}

// ==========================================
// 6. FUNGSI AUTH (LOGIN, REGISTER, GOOGLE, LOGOUT)
// ==========================================

// 6a. Login Email
async function handleLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state listener akan menangani sisanya
  } catch (error) {
    alert('Login gagal: ' + error.message);
    console.error('[Auth] Login error:', error);
  }
}

// 6b. Register Email
async function handleRegister(name, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Simpan nama pengguna di Firestore (koleksi /users/{uid})
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name: name,
      email: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Auth state listener akan menangani sisanya
  } catch (error) {
    alert('Registrasi gagal: ' + error.message);
    console.error('[Auth] Register error:', error);
  }
}

// 6c. Login dengan Google
async function handleGoogleLogin() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    // Auth state listener akan menangani sisanya
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user') {
      alert('Login dengan Google gagal: ' + error.message);
      console.error('[Auth] Google login error:', error);
    }
  }
}

// 6d. Logout
async function handleLogout() {
  try {
    await signOut(auth);
    // Auth state listener akan menangani sisanya
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    alert('Gagal keluar: ' + error.message);
  }
}

// ==========================================
// 7. UPDATE USER INFO DI SHELL
// ==========================================
function updateUserUI(user) {
  // Ambil nama dari Firestore
  const userRef = doc(db, 'users', user.uid);
  getDoc(userRef).then((docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const displayName = data.name || user.displayName || 'Pengguna';
      
      // Update nama di header
      const nameSpan = document.getElementById('user-name');
      if (nameSpan) nameSpan.textContent = displayName;
      
      // Update avatar di header dan sidebar (jika ada)
      const avatarElements = document.querySelectorAll('#header-avatar, #sidebar-avatar');
      const photoURL = user.photoURL || 'assets/images/default-avatar.png';
      avatarElements.forEach(el => {
        if (el) el.src = photoURL;
      });
    }
  }).catch((error) => {
    console.warn('[Auth] Gagal mengambil data user:', error);
    // Fallback: pakai displayName dari auth
    const nameSpan = document.getElementById('user-name');
    if (nameSpan) nameSpan.textContent = user.displayName || 'Pengguna';
  });
}

// ==========================================
// 8. UPDATE RIGHT PANEL (SIDEBAR KANAN)
// ==========================================

export async function updateRightPanel() {
  const user = auth.currentUser;
  if (!user) {
    // Sembunyikan panel atau tampilkan kosong
    document.getElementById('right-panel').innerHTML = `
      <div class="widget" style="text-align:center;padding:2rem 1rem;">
        <p style="color:var(--color-text-muted);font-size:0.85rem;">Silakan login</p>
      </div>
    `;
    return;
  }

  const uid = user.uid;
  const todayString = new Date().toISOString().split('T')[0];

  try {
    // Ambil data secara paralel
    const [todosSnap, diarySnap, habitsSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'todos')),
      getDocs(collection(db, 'users', uid, 'diary')),
      getDocs(collection(db, 'users', uid, 'habits'))
    ]);

    const todos = [];
    todosSnap.forEach(doc => todos.push({ id: doc.id, ...doc.data() }));

    const diaries = [];
    diarySnap.forEach(doc => diaries.push({ id: doc.id, ...doc.data() }));

    const habits = [];
    habitsSnap.forEach(doc => habits.push({ id: doc.id, ...doc.data() }));

    // Hitung statistik
    const todayTodos = todos.filter(t => t.deadline === todayString);
    const doneTodos = todayTodos.filter(t => t.done === true);
    const todoProgress = todayTodos.length > 0 ? Math.round((doneTodos.length / todayTodos.length) * 100) : 0;

    // Hitung habit yang sudah dikerjakan hari ini
    let habitsDone = 0;
    habits.forEach(habit => {
      if (habit.logs && habit.logs[todayString] === true) {
        habitsDone++;
      }
    });
    const habitProgress = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 0;

    // Hitung streak dari habit pertama (ambil yang tertinggi)
    let maxStreak = 0;
    habits.forEach(habit => {
      const streak = habit.streak || 0;
      if (streak > maxStreak) maxStreak = streak;
    });

    // Mood hari ini (ambil dari diary terakhir hari ini)
    const todayDiary = diaries.filter(d => d.date === todayString);
    let todayMood = '😐';
    if (todayDiary.length > 0) {
      // Ambil mood dari diary terbaru hari ini
      const latest = todayDiary.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))[0];
      if (latest.mood) todayMood = latest.mood;
    }

    // Quote acak (sederhana)
    const quotes = [
      '"Hari ini adalah awal dari segalanya."',
      '"Kamu lebih kuat dari yang kamu pikirkan."',
      '"Konsistensi adalah kunci."',
      '"Setiap langkah kecil berarti."',
      '"Jangan bandingkan harimu dengan orang lain."'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Update HTML panel kanan
    const rightPanel = document.getElementById('right-panel');
    if (!rightPanel) return;

    rightPanel.innerHTML = `
      <div class="widget mood-widget">
        <h4><i class="fas fa-smile"></i> Mood Hari Ini</h4>
        <div class="mood-emoji-list" style="font-size:2rem;text-align:center;padding:0.5rem 0;">
          ${todayMood}
        </div>
      </div>

      <div class="widget streak-widget">
        <h4><i class="fas fa-calendar-check"></i> Streak</h4>
        <div class="streak-number">${maxStreak} <span>hari</span></div>
        <p style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.2rem;">Terus konsisten!</p>
      </div>

      <div class="widget quote-widget">
        <h4><i class="fas fa-quote-left"></i> Quote</h4>
        <blockquote>${randomQuote}</blockquote>
      </div>

      <div class="widget progress-widget">
        <h4><i class="fas fa-chart-simple"></i> Progress Hari Ini</h4>
        <div class="progress-item">
          <span>To-Do Selesai</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${todoProgress}%;background:${todoProgress === 100 ? 'var(--color-accent-success)' : todoProgress > 50 ? 'var(--color-accent-amber)' : 'var(--color-accent-danger)'};"></div></div>
          <span class="progress-label">${doneTodos.length}/${todayTodos.length}</span>
        </div>
        <div class="progress-item">
          <span>Habit Tercapai</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${habitProgress}%;background:${habitProgress === 100 ? 'var(--color-accent-success)' : habitProgress > 50 ? 'var(--color-accent-amber)' : 'var(--color-accent-danger)'};"></div></div>
          <span class="progress-label">${habitsDone}/${habits.length}</span>
        </div>
      </div>
    `;

    console.log('[RightPanel] Updated');
  } catch (error) {
    console.error('[RightPanel] Error:', error);
    // Tampilkan pesan error di panel
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="widget" style="text-align:center;padding:1rem;">
          <p style="color:var(--color-accent-danger);font-size:0.8rem;">Gagal memuat data</p>
        </div>
      `;
    }
  }
}

// ==========================================
// 9. AUTH STATE LISTENER (INTI APLIKASI)
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ========== USER LOGIN ==========
    console.log('[Auth] User login:', user.uid);

    // Update UI dengan data user
    updateUserUI(user);

    // Inisialisasi Router (jika belum)
    // Router akan otomatis mengambil alih navigasi dan inject konten
    initRouter();

    // Navigasi ke Dashboard (halaman default)
    navigateTo('dashboard');

    // Pasang event listener untuk tombol logout (hanya sekali)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      // Clone node untuk menghilangkan listener lama (jika ada)
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
      newLogoutBtn.addEventListener('click', handleLogout);
    }

    // Pasang event listener untuk menu navigasi (sidebar & bottom nav)
    // Karena kita menggunakan event delegation global di router, tidak perlu pasang lagi.
    // Tapi kita tetap pastikan navigasi berfungsi.

  } else {
    // ========== USER LOGOUT / TIDAK LOGIN ==========
    console.log('[Auth] User logout / tidak login');

    // Hancurkan router jika ada (biarkan saja, nanti di-reinit)
    // Tampilkan halaman login
    renderAuthPage();
  }
});

// ==========================================
// 10. EKSPOR FUNGSI LOGOUT (jika dibutuhkan komponen lain)
// ==========================================
export { handleLogout };