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
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { navigateTo, initRouter, destroyRouter } from './router.js';

// ==========================================
// 2. REFERENSI DOM
// ==========================================
const appShell = document.getElementById('app');
const bottomNav = document.getElementById('bottom-nav');
const authContainerId = 'auth-container';

// ==========================================
// 3. FUNGSI MENAMPILKAN / MENYEMBUNYIKAN SHELL
// ==========================================

// Sembunyikan shell segera (dipanggil di awal)
function hideAppShell() {
  if (appShell) appShell.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';
}

// Tampilkan shell dan hapus halaman login
function showAppShell() {
  // Hapus container login jika ada
  const existingAuth = document.getElementById(authContainerId);
  if (existingAuth) {
    existingAuth.remove();
  }

  // Tampilkan shell
  if (appShell) appShell.style.display = 'grid';
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
  // 5. REFERENSI ELEMEN
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
// 8. FUNGSI AUTH
// ==========================================

// 8a. Login Email
async function handleLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert('Login gagal: ' + error.message);
    console.error('[Auth] Login error:', error);
  }
}

// 8b. Register Email
async function handleRegister(name, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name: name || 'Pengguna',
      email: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    alert('Registrasi gagal: ' + error.message);
    console.error('[Auth] Register error:', error);
  }
}

// 8c. Login dengan Google
async function handleGoogleLogin() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user') {
      alert('Login dengan Google gagal: ' + error.message);
      console.error('[Auth] Google login error:', error);
    }
  }
}

// 8d. Logout
async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    alert('Gagal keluar: ' + error.message);
  }
}

// ==========================================
// 9. UPDATE USER INFO (ASYNC)
// ==========================================
async function updateUserUI(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    let displayName = 'Pengguna';
    let photoURL = 'assets/images/default-avatar.png';

    if (docSnap.exists()) {
      const data = docSnap.data();
      displayName = data.name || user.displayName || 'Pengguna';
    } else {
      // Buat dokumen user jika belum ada
      await setDoc(userRef, {
        name: user.displayName || 'Pengguna',
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      displayName = user.displayName || 'Pengguna';
    }

    // Update UI
    const nameSpan = document.getElementById('user-name');
    if (nameSpan) nameSpan.textContent = displayName;

    const avatarElements = document.querySelectorAll('#header-avatar, #sidebar-avatar');
    const avatarUrl = user.photoURL || photoURL;
    avatarElements.forEach(el => {
      if (el) el.src = avatarUrl;
    });

    return displayName;
  } catch (error) {
    console.warn('[Auth] Gagal mengambil data user:', error);
    const nameSpan = document.getElementById('user-name');
    if (nameSpan) nameSpan.textContent = user.displayName || 'Pengguna';
    return user.displayName || 'Pengguna';
  }
}

// ==========================================
// 10. UPDATE RIGHT PANEL
// ==========================================
export async function updateRightPanel() {
  const user = auth.currentUser;
  if (!user) {
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

    const todayTodos = todos.filter(t => t.deadline === todayString);
    const doneTodos = todayTodos.filter(t => t.done === true);
    const todoProgress = todayTodos.length > 0 ? Math.round((doneTodos.length / todayTodos.length) * 100) : 0;

    let habitsDone = 0;
    habits.forEach(habit => {
      if (habit.logs && habit.logs[todayString] === true) habitsDone++;
    });
    const habitProgress = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 0;

    let maxStreak = 0;
    habits.forEach(habit => {
      const streak = habit.streak || 0;
      if (streak > maxStreak) maxStreak = streak;
    });

    const todayDiary = diaries.filter(d => d.date === todayString);
    let todayMood = '😐';
    if (todayDiary.length > 0) {
      const latest = todayDiary.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))[0];
      if (latest.mood) todayMood = latest.mood;
    }

    const quotes = [
      '"Hari ini adalah awal dari segalanya."',
      '"Kamu lebih kuat dari yang kamu pikirkan."',
      '"Konsistensi adalah kunci."',
      '"Setiap langkah kecil berarti."',
      '"Jangan bandingkan harimu dengan orang lain."'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

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
// 11. AUTH STATE LISTENER (INTI APLIKASI)
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ========== USER LOGIN ==========
    console.log('[Auth] User login:', user.uid);

    // 1. Tampilkan shell dan hapus login page
    showAppShell();

    // 2. Inisialisasi router
    initRouter();

    // 3. Update UI user (ambil nama dari Firestore)
    await updateUserUI(user);

    // 4. Update panel kanan
    await updateRightPanel();

    // 5. Navigasi ke dashboard
    import('../js/router.js').then(module => {
      module.navigateTo('dashboard', true);
    });

    // 6. Pasang listener logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
      newLogoutBtn.addEventListener('click', handleLogout);
    }

  } else {
    // ========== USER LOGOUT / TIDAK LOGIN ==========
    console.log('[Auth] User logout / tidak login');

    // Hancurkan router
    destroyRouter();

    // Tampilkan halaman login
    renderAuthPage();
  }
});

// ==========================================
// 12. EKSPOR FUNGSI LOGOUT & UPDATE PANEL
// ==========================================
export { handleLogout };

// ==========================================
// 13. PASTIKAN SHELL TERSEMBUNYI DI AWAL
// ==========================================
hideAppShell();
