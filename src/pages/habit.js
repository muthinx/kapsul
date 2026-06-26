// ==========================================
// HABIT.JS - HALAMAN KEBIASAAN KAPSUL
// Terintegrasi dengan habit-grid.js & loader.js
// ==========================================

import { auth, db } from '../js/firebase-init.js';
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { renderHabitGrid, attachHabitEvents } from '../components/habit-grid.js';
import { showFullscreenLoader, hideFullscreenLoader } from '../components/loader.js';
import { getLocalDateString } from '../utils/date-helper.js';

// ==========================================
// 1. STATE
// ==========================================
const MAX_HABITS = 5;
let currentEditId = null;

// ==========================================
// 2. RENDER UTAMA
// ==========================================
export async function render() {
  const user = auth.currentUser;
  if (!user) {
    return `<div class="empty-state"><p>Silakan login terlebih dahulu.</p></div>`;
  }

  const uid = user.uid;

  try {
    const habitsRef = collection(db, 'users', uid, 'habits');
    const snapshot = await getDocs(habitsRef);
    const habits = [];
    snapshot.forEach(doc => {
      habits.push({ id: doc.id, ...doc.data() });
    });

    if (habits.length === 0) {
      return `
        <div class="habit-container">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
            <h3 style="font-family:var(--font-serif);margin:0;">🔥 Kebiasaan</h3>
            <button class="btn btn-primary" id="btn-add-habit-empty">
              <i class="fas fa-plus"></i> Tambah Habit
            </button>
          </div>
          <div class="empty-state">
            <i class="fas fa-fire" style="color:var(--color-accent-amber);"></i>
            <h3>Belum ada kebiasaan</h3>
            <p>Mulai bangun kebiasaan baik hari ini!</p>
            <button class="btn btn-primary" id="btn-add-habit-first">
              <i class="fas fa-plus"></i> Tambah Habit Pertama
            </button>
          </div>
          <div id="habit-modal-container"></div>
        </div>
      `;
    }

    const habitsHtml = habits.map(habit => {
      return renderHabitGrid(habit, {
        mode: 'full',
        onToggle: (habitId, date, isDone) => window.__toggleHabit(habitId, date, isDone),
        onEdit: (habitId) => window.__editHabit(habitId),
        onDelete: (habitId) => window.__deleteHabit(habitId)
      });
    }).join('');

    return `
      <div class="habit-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.8rem;">
          <div>
            <h3 style="font-family:var(--font-serif);margin:0;">🔥 Kebiasaan</h3>
            <p style="margin:0;font-size:0.85rem;color:var(--color-text-secondary);">
              ${habits.length} dari ${MAX_HABITS} kebiasaan aktif
            </p>
          </div>
          <button class="btn btn-primary" id="btn-add-habit" ${habits.length >= MAX_HABITS ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            <i class="fas fa-plus"></i> Tambah Habit
          </button>
        </div>

        <div id="habit-list">
          ${habitsHtml}
        </div>

        <div id="habit-modal-container"></div>
      </div>
    `;

  } catch (error) {
    console.error('[Habit] Error:', error);
    return `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat habit</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 3. INISIALISASI EVENT
// ==========================================
export function initHabitEvents() {
  let modalContainer = document.getElementById('habit-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'habit-modal-container';
    const container = document.querySelector('.habit-container');
    if (container) container.appendChild(modalContainer);
  }

  const addButtons = document.querySelectorAll('#btn-add-habit, #btn-add-habit-first, #btn-add-habit-empty');
  addButtons.forEach(btn => {
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.__openHabitModal();
      });
    }
  });

  const container = document.getElementById('habit-list');
  if (container) {
    attachHabitEvents(container, {
      onToggle: (habitId, date, isDone) => window.__toggleHabit(habitId, date, isDone),
      onEdit: (habitId) => window.__editHabit(habitId),
      onDelete: (habitId) => window.__deleteHabit(habitId)
    });
  }
}

// ==========================================
// 4. FUNGSI CRUD
// ==========================================

window.__openHabitModal = (editData = null) => {
  let container = document.getElementById('habit-modal-container');
  if (!container) {
    const habitContainer = document.querySelector('.habit-container');
    if (habitContainer) {
      container = document.createElement('div');
      container.id = 'habit-modal-container';
      habitContainer.appendChild(container);
    } else {
      alert('Terjadi kesalahan, coba refresh halaman.');
      return;
    }
  }

  const isEdit = editData !== null;
  const title = isEdit ? 'Edit Kebiasaan' : 'Tambah Kebiasaan Baru';
  const submitText = isEdit ? 'Simpan Perubahan' : 'Tambahkan';
  const editName = isEdit ? editData.name || '' : '';

  container.innerHTML = `
    <div class="modal-overlay" id="habit-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="habit-form">
          <div class="form-group">
            <label class="form-label">Nama Kebiasaan <span style="color:var(--color-accent-danger);">*</span></label>
            <input type="text" id="habit-name" class="form-input" placeholder="Misal: Olahraga, Membaca, Meditasi..." value="${editName}" required autofocus>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">
            <i class="fas fa-save"></i> ${submitText}
          </button>
        </form>
      </div>
    </div>
  `;

  currentEditId = isEdit ? editData.id : null;

  document.getElementById('modal-close-btn').addEventListener('click', () => {
    window.__closeHabitModal();
  });

  document.getElementById('habit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.__saveHabit();
  });
};

window.__closeHabitModal = () => {
  const container = document.getElementById('habit-modal-container');
  if (container) container.innerHTML = '';
  currentEditId = null;
};

window.__saveHabit = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  const nameInput = document.getElementById('habit-name');
  if (!nameInput) {
    alert('Form tidak ditemukan, coba tutup dan buka lagi.');
    return;
  }

  const name = nameInput.value.trim();
  if (!name) {
    alert('Nama kebiasaan tidak boleh kosong!');
    nameInput.focus();
    return;
  }

  const uid = user.uid;
  const habitsRef = collection(db, 'users', uid, 'habits');

  showFullscreenLoader('Menyimpan kebiasaan...');

  try {
    if (currentEditId) {
      const docRef = doc(db, 'users', uid, 'habits', currentEditId);
      await updateDoc(docRef, {
        name: name,
        updatedAt: serverTimestamp()
      });
      console.log('[Habit] Update berhasil:', currentEditId);
    } else {
      const snapshot = await getDocs(habitsRef);
      if (snapshot.size >= MAX_HABITS) {
        alert(`Maksimal ${MAX_HABITS} kebiasaan. Hapus salah satu untuk menambah baru.`);
        hideFullscreenLoader();
        return;
      }

      await addDoc(habitsRef, {
        name: name,
        logs: {},
        streak: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[Habit] Tambah berhasil');
    }

    window.__closeHabitModal();
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Habit] Gagal menyimpan:', error);
    hideFullscreenLoader();
    alert('Gagal menyimpan habit: ' + error.message);
  }
};

window.__toggleHabit = async (habitId, date, isDone) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  showFullscreenLoader('Memperbarui kebiasaan...', 'fa-sync');

  try {
    const docRef = doc(db, 'users', user.uid, 'habits', habitId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      alert('Kebiasaan tidak ditemukan');
      hideFullscreenLoader();
      return;
    }

    const data = docSnap.data();
    const logs = data.logs || {};

    if (isDone) {
      delete logs[date];
    } else {
      logs[date] = true;
    }

    const todayStr = getLocalDateString();
    const newStreak = calculateStreak(logs, todayStr);

    await updateDoc(docRef, {
      logs: logs,
      streak: newStreak,
      updatedAt: serverTimestamp()
    });

    console.log('[Habit] Toggle berhasil:', habitId, date, isDone ? 'uncheck' : 'check');
    hideFullscreenLoader();
    reloadPage(); // <-- sekarang pakai force reload
  } catch (error) {
    console.error('[Habit] Gagal toggle:', error);
    hideFullscreenLoader();
    alert('Gagal mengubah status habit: ' + error.message);
  }
};

window.__editHabit = async (habitId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'habits', habitId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      window.__openHabitModal({ id: habitId, ...data });
    } else {
      alert('Data kebiasaan tidak ditemukan');
    }
  } catch (error) {
    console.error('[Habit] Gagal mengambil data:', error);
    alert('Gagal memuat data kebiasaan');
  }
};

window.__deleteHabit = async (habitId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  if (!confirm('Yakin ingin menghapus kebiasaan ini? Semua data log akan hilang.')) {
    return;
  }

  showFullscreenLoader('Menghapus kebiasaan...', 'fa-trash');

  try {
    const docRef = doc(db, 'users', user.uid, 'habits', habitId);
    await deleteDoc(docRef);
    console.log('[Habit] Hapus berhasil:', habitId);
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Habit] Gagal menghapus:', error);
    hideFullscreenLoader();
    alert('Gagal menghapus habit: ' + error.message);
  }
};

// ==========================================
// 5. FUNGSI PEMBANTU
// ==========================================
function calculateStreak(logs, todayStr) {
  let streak = 0;
  let currentDate = new Date(todayStr);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (logs[dateStr] === true) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function reloadPage() {
  import('../js/router.js').then(module => {
    module.navigateTo('habit', true); // FORCE RELOAD
  });
}

// ==========================================
// 6. OVERRIDE RENDER UNTUK INIT EVENT
// ==========================================
const originalRender = render;
render = async function() {
  const result = await originalRender();
  setTimeout(() => {
    initHabitEvents();
  }, 100);
  return result;
};

export { render as default };