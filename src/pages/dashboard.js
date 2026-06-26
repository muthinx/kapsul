// ==========================================
// DASHBOARD.JS - HALAMAN UTAMA KAPSUL
// Terintegrasi dengan diary-card.js, todo-item.js & loader.js
// ==========================================

import { auth, db } from '../js/firebase-init.js';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { renderDiaryCard } from '../components/diary-card.js';
import { renderTodoItem } from '../components/todo-item.js';
import { showFullscreenLoader, hideFullscreenLoader } from '../components/loader.js';
import { getLocalDateString } from '../utils/date-helper.js';

// ==========================================
// 1. FUNGSI PEMBANTU
// ==========================================

function getTodayString() {
  return getLocalDateString();
}

function getTimeBlock(hours) {
  if (hours >= 5 && hours < 12) return { label: '🌅 Pagi', key: 'pagi' };
  if (hours >= 12 && hours < 16) return { label: '☀️ Siang', key: 'siang' };
  if (hours >= 16 && hours < 19) return { label: '🌇 Sore', key: 'sore' };
  if (hours >= 19 || hours < 5) return { label: '🌙 Malam', key: 'malam' };
  return { label: '📅 Lainnya', key: 'lainnya' };
}

function getHoursFromTimestamp(timestamp) {
  if (!timestamp) return 0;
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.getHours();
  } catch (e) {
    return 0;
  }
}

function getTimeBlockFromKey(key) {
  const map = {
    pagi: '🌅 Pagi',
    siang: '☀️ Siang',
    sore: '🌇 Sore',
    malam: '🌙 Malam',
    lainnya: '📅 Lainnya'
  };
  return map[key] || '📅 Lainnya';
}

// ==========================================
// 2. RENDER UTAMA
// ==========================================
export async function render() {
  const user = auth.currentUser;
  if (!user) {
    return `<div class="empty-state"><p>Silakan login terlebih dahulu.</p></div>`;
  }

  const uid = user.uid;
  const todayString = getTodayString();

  try {
    // ==========================================
    // 3. AMBIL DATA DARI FIRESTORE (PARALEL)
    // ==========================================
    
    // 3a. Ambil To-Do dengan deadline hari ini
    const todosQuery = query(
      collection(db, 'users', uid, 'todos'),
      where('deadline', '==', todayString),
      orderBy('createdAt', 'desc')
    );
    const todosSnapshot = await getDocs(todosQuery);
    const todayTodos = [];
    todosSnapshot.forEach(doc => {
      todayTodos.push({ id: doc.id, ...doc.data() });
    });

    // 3b. Ambil Diary hari ini
    const diaryQuery = query(
      collection(db, 'users', uid, 'diary'),
      where('date', '==', todayString),
      orderBy('createdAt', 'asc')
    );
    const diarySnapshot = await getDocs(diaryQuery);
    const todayDiary = [];
    diarySnapshot.forEach(doc => {
      todayDiary.push({ id: doc.id, ...doc.data() });
    });

    // 3c. Ambil semua Habit untuk cek progres hari ini
    const habitsSnapshot = await getDocs(collection(db, 'users', uid, 'habits'));
    const habits = [];
    habitsSnapshot.forEach(doc => {
      habits.push({ id: doc.id, ...doc.data() });
    });

    // Hitung habit yang sudah dikerjakan hari ini
    let habitsDone = 0;
    habits.forEach(habit => {
      if (habit.logs && habit.logs[todayString] === true) {
        habitsDone++;
      }
    });

    // ==========================================
    // 4. LOGIKA "KEGIATAN SEKARANG"
    // ==========================================
    const pendingTodos = todayTodos.filter(todo => todo.done !== true);
    let nowTask = null;
    
    if (pendingTodos.length > 0) {
      nowTask = pendingTodos[0];
    } else if (todayTodos.length > 0 && todayTodos.every(t => t.done === true)) {
      nowTask = { allDone: true };
    } else {
      nowTask = { empty: true };
    }

    // ==========================================
    // 5. LOGIKA TIMELINE
    // ==========================================
    const timelineEvents = [];

    todayDiary.forEach(entry => {
      const hours = getHoursFromTimestamp(entry.createdAt);
      const block = getTimeBlock(hours);
      timelineEvents.push({
        type: 'diary',
        block: block.key,
        time: hours,
        data: entry,
        label: block.label
      });
    });

    const completedTodos = todayTodos.filter(todo => todo.done === true);
    completedTodos.forEach(todo => {
      const hours = getHoursFromTimestamp(todo.updatedAt || todo.createdAt);
      const block = getTimeBlock(hours);
      timelineEvents.push({
        type: 'todo',
        block: block.key,
        time: hours,
        data: todo,
        label: block.label
      });
    });

    timelineEvents.sort((a, b) => a.time - b.time);

    const groupedEvents = {
      pagi: [],
      siang: [],
      sore: [],
      malam: [],
      lainnya: []
    };

    timelineEvents.forEach(event => {
      if (groupedEvents[event.block]) {
        groupedEvents[event.block].push(event);
      } else {
        groupedEvents['lainnya'].push(event);
      }
    });

    const activeBlocks = ['pagi', 'siang', 'sore', 'malam', 'lainnya']
      .filter(key => groupedEvents[key].length > 0)
      .map(key => ({ key, label: getTimeBlockFromKey(key), events: groupedEvents[key] }));

    // ==========================================
    // 6. RENDER HTML
    // ==========================================

    // 6a. Bagian "Sekarang"
    let nowHtml = '';
    if (nowTask && nowTask.allDone) {
      nowHtml = `
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <i class="fas fa-check-circle" style="font-size:2rem;color:var(--color-accent-success);"></i>
          <div>
            <div style="font-weight:600;color:var(--color-text-primary);">Semua selesai! 🎉</div>
            <div style="font-size:0.85rem;color:var(--color-text-secondary);">Kamu sudah menyelesaikan semua tugas hari ini. Istirahat sejenak!</div>
          </div>
        </div>
      `;
    } else if (nowTask && nowTask.empty) {
      nowHtml = `
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <i class="fas fa-smile" style="font-size:2rem;color:var(--color-accent-amber);"></i>
          <div>
            <div style="font-weight:600;color:var(--color-text-primary);">Tidak ada tugas hari ini</div>
            <div style="font-size:0.85rem;color:var(--color-text-secondary);">Santai dulu, atau buat tugas baru di menu To-Do List!</div>
          </div>
        </div>
      `;
    } else if (nowTask) {
      // Gunakan renderTodoItem untuk menampilkan tugas dengan tombol selesai
      // Tapi kita perlu custom tombol karena di dashboard kita ingin tombol "Tandai Selesai"
      // Kita bisa render manual atau gunakan komponen dengan opsi khusus.
      // Kita akan buat manual agar lebih fleksibel.
      nowHtml = `
        <div style="display:flex;align-items:flex-start;gap:0.8rem;">
          <i class="fas fa-bullseye" style="font-size:1.5rem;color:var(--color-accent-danger);margin-top:0.2rem;"></i>
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--color-text-primary);">${nowTask.title || 'Tugas tanpa judul'}</div>
            <div style="font-size:0.8rem;color:var(--color-text-secondary);">
              <i class="far fa-clock"></i> Deadline hari ini
              ${nowTask.priority === 'urgent' ? ' <span class="badge badge-urgent">Urgent</span>' : ''}
            </div>
            <div style="margin-top:0.5rem;">
              <button class="btn btn-primary btn-sm" data-action="mark-todo-done" data-id="${nowTask.id}">
                <i class="fas fa-check"></i> Tandai Selesai
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 6b. Bagian Timeline - gunakan komponen
    let timelineHtml = '';
    if (activeBlocks.length === 0) {
      timelineHtml = `
        <div class="empty-state" style="padding:1rem 0;">
          <i class="fas fa-hourglass-start"></i>
          <p style="font-size:0.9rem;">Belum ada catatan atau aktivitas hari ini.</p>
          <p style="font-size:0.8rem;color:var(--color-text-muted);">Mulai tulis diary atau selesaikan to-do untuk mengisi timeline!</p>
        </div>
      `;
    } else {
      activeBlocks.forEach(block => {
        timelineHtml += `
          <div class="timeline-block" style="margin-bottom:1.2rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;border-bottom:2px solid var(--color-border);padding-bottom:0.3rem;">
              <span style="font-family:var(--font-serif);font-weight:600;font-size:1rem;color:var(--color-text-primary);">${block.label}</span>
              <span style="font-size:0.7rem;color:var(--color-text-muted);background:var(--color-bg-sidebar);padding:0.1rem 0.6rem;border-radius:20px;">${block.events.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
        `;

        block.events.forEach((event) => {
          if (event.type === 'diary') {
            // Gunakan renderDiaryCard dengan mode compact
            timelineHtml += renderDiaryCard(event.data, {
              showActions: false,
              isCompact: true
            });
          } else if (event.type === 'todo') {
            // Gunakan renderTodoItem dengan mode compact
            timelineHtml += renderTodoItem(event.data, {
              isCompact: true,
              showDelete: false
            });
          }
        });

        timelineHtml += `
            </div>
          </div>
        `;
      });
    }

    // 6c. Statistik
    const totalTodos = todayTodos.length;
    const doneTodos = todayTodos.filter(t => t.done === true).length;
    const totalDiary = todayDiary.length;

    // ==========================================
    // 7. GABUNGKAN SEMUA HTML
    // ==========================================
    return `
      <div class="dashboard-container">
        <!-- Statistik Singkat -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.8rem;margin-bottom:1.5rem;">
          <div class="stat-card" style="background:var(--color-bg-card);border-radius:var(--radius-card);padding:0.8rem 1rem;text-align:center;border:1px solid var(--color-border);">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-primary);">${totalTodos}</div>
            <div style="font-size:0.7rem;color:var(--color-text-muted);">To-Do Hari Ini</div>
          </div>
          <div class="stat-card" style="background:var(--color-bg-card);border-radius:var(--radius-card);padding:0.8rem 1rem;text-align:center;border:1px solid var(--color-border);">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-accent-success);">${doneTodos}</div>
            <div style="font-size:0.7rem;color:var(--color-text-muted);">Selesai</div>
          </div>
          <div class="stat-card" style="background:var(--color-bg-card);border-radius:var(--radius-card);padding:0.8rem 1rem;text-align:center;border:1px solid var(--color-border);">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-accent-amber);">${totalDiary}</div>
            <div style="font-size:0.7rem;color:var(--color-text-muted);">Catatan Diary</div>
          </div>
          <div class="stat-card" style="background:var(--color-bg-card);border-radius:var(--radius-card);padding:0.8rem 1rem;text-align:center;border:1px solid var(--color-border);">
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-primary-light);">${habitsDone}/${habits.length}</div>
            <div style="font-size:0.7rem;color:var(--color-text-muted);">Habit Tercapai</div>
          </div>
        </div>

        <!-- Kartu SEKARANG -->
        <div class="card" style="border-left:4px solid var(--color-accent-danger);margin-bottom:1.5rem;background:linear-gradient(135deg, #fff8f5 0%, #ffffff 100%);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem;">
            <span style="font-family:var(--font-serif);font-weight:600;font-size:0.9rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;">⚡ Sekarang</span>
            <span style="font-size:0.7rem;color:var(--color-text-muted);background:var(--color-bg-sidebar);padding:0.1rem 0.6rem;border-radius:20px;">Prioritas</span>
          </div>
          ${nowHtml}
        </div>

        <!-- Timeline Hari Ini -->
        <div class="card" style="margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;">
            <span style="font-family:var(--font-serif);font-weight:600;font-size:1.1rem;color:var(--color-text-primary);">📖 Timeline Hari Ini</span>
            <span style="font-size:0.7rem;color:var(--color-text-muted);">${todayString}</span>
          </div>
          ${timelineHtml}
        </div>

        <!-- Tombol Aksi Cepat -->
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:1rem;">
          <button class="btn btn-primary" data-action="navigate" data-page="diary">
            <i class="fas fa-pen"></i> Tulis Diary
          </button>
          <button class="btn btn-success" data-action="navigate" data-page="todo">
            <i class="fas fa-plus"></i> Tambah To-Do
          </button>
          <button class="btn btn-ghost" data-action="navigate" data-page="habit">
            <i class="fas fa-fire"></i> Cek Habit
          </button>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat dashboard</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 8. EVENT DELEGATION UNTUK DASHBOARD
// ==========================================
export function initDashboardEvents() {
  const container = document.getElementById('content');
  if (!container) return;

  // Event delegation untuk tombol "Tandai Selesai"
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="mark-todo-done"]');
    if (btn) {
      e.preventDefault();
      const todoId = btn.dataset.id;
      if (todoId) {
        await window.__markTodoDone(todoId);
      }
      return;
    }

    // Navigasi cepat
    const navBtn = e.target.closest('[data-action="navigate"]');
    if (navBtn) {
      e.preventDefault();
      const page = navBtn.dataset.page;
      if (page) {
        import('../js/router.js').then(module => {
          module.navigateTo(page);
        });
      }
      return;
    }
  });
}

// ==========================================
// 9. FUNGSI MARK TODO DONE (DIEKSPOS)
// ==========================================
window.__markTodoDone = async (todoId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  showFullscreenLoader('Memperbarui tugas...', 'fa-check');

  try {
    const docRef = doc(db, 'users', user.uid, 'todos', todoId);
    await updateDoc(docRef, {
      done: true,
      updatedAt: serverTimestamp()
    });
    console.log('[Dashboard] Todo marked done:', todoId);
    hideFullscreenLoader();
    // Reload dashboard
    import('../js/router.js').then(module => {
      module.navigateTo('dashboard', true);
    });
  } catch (error) {
    console.error('[Dashboard] Gagal menandai selesai:', error);
    hideFullscreenLoader();
    alert('Gagal menandai tugas selesai: ' + error.message);
  }
};

// ==========================================
// 10. OVERRIDE RENDER UNTUK INIT EVENT
// ==========================================
const originalRender = render;
render = async function() {
  const result = await originalRender();
  setTimeout(() => {
    initDashboardEvents();
  }, 100);
  return result;
};

export { render as default };