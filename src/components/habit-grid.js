// ==========================================
// HABIT-GRID.JS - KOMPONEN GRID KEBIASAAN
// Digunakan di halaman Habit
// ==========================================

import { getLocalDateString } from '../utils/date-helper.js';

/**
 * Render grid habit (heatmap) untuk satu habit
 * @param {Object} habit - Data habit dari Firestore
 * @param {string} habit.id - ID dokumen
 * @param {string} habit.name - Nama habit
 * @param {Object} habit.logs - Object dengan key tanggal YYYY-MM-DD, value boolean
 * @param {number} habit.streak - Jumlah streak saat ini (opsional, akan dihitung ulang)
 * @param {Object} habit.createdAt - Firestore Timestamp
 * @param {Object} options - Opsi tambahan
 * @param {Object} option.today - 
 * @param {string} options.mode - 'full' (tampilkan semua bulan) atau 'compact' (hanya bulan ini)
 * @param {function} options.onToggle - Callback saat kotak diklik (habitId, date, isDone)
 * @param {function} options.onDelete - Callback saat tombol hapus diklik
 * @param {function} options.onEdit - Callback saat tombol edit diklik
 * @returns {string} HTML grid habit
 */
export function renderHabitGrid(habit, options = {}) {
  const {
    mode = 'full',
    today : todayParam,
    onToggle = null,
    onDelete = null,
    onEdit = null
  } = options;

  const logs = habit.logs || {};
  const todayString = todayParam || getLocalDateString();
  
  // Hitung streak (jika belum ada di data)
  const streak = habit.streak || calculateStreak(logs);
  const totalDays = Object.keys(logs).length;
  const doneToday = logs[todayString] === true;

  // Tentukan bulan-bulan yang akan ditampilkan
  let monthsToShow = [];
  if (mode === 'compact') {
    // Hanya bulan ini
    const currentMonth = todayString.substring(0, 7); // YYYY-MM
    monthsToShow = [currentMonth];
  } else {
    // Semua bulan yang ada di logs + bulan ini
    const allMonths = new Set();
    Object.keys(logs).forEach(date => {
      allMonths.add(date.substring(0, 7));
    });
    // Tambahkan bulan ini jika belum ada
    allMonths.add(todayString.substring(0, 7));
    // Urutkan dari yang tertua ke terbaru
    monthsToShow = Array.from(allMonths).sort();
  }

  // ==========================================
  // GENERATE HTML UNTUK SETIAP BULAN
  // ==========================================
  let monthsHtml = '';
  monthsToShow.forEach(month => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, monthNum);
    const firstDayOfWeek = getFirstDayOfWeek(year, monthNum); // 0 = Minggu, 1 = Senin, dst

    // Nama bulan dalam Bahasa Indonesia
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthLabel = `${monthNames[monthNum - 1]} ${year}`;

    // Buat grid 7 kolom
    let daysHtml = '';
    
    // Tambahkan sel kosong di awal sesuai hari pertama
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysHtml += `<div class="habit-day empty"></div>`;
    }

    // Loop setiap hari di bulan
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayString;
      const isDone = logs[dateStr] === true;
      const isFuture = dateStr > todayString;

      let classes = 'habit-day';
      if (isToday) classes += ' today';
      if (isDone) classes += ' done';
      if (isFuture) classes += ' empty'; // tidak bisa klik untuk hari esok

      // Data attribute untuk toggle
      const dataAttrs = `data-habit-id="${habit.id}" data-date="${dateStr}" data-done="${isDone}"`;

      daysHtml += `
        <div class="${classes}" ${dataAttrs} ${!isFuture ? 'style="cursor:pointer;"' : ''}>
          ${isDone ? '' : ''}
        </div>
      `;
    }

    monthsHtml += `
      <div class="habit-month" style="margin-bottom:1.2rem;">
        <div style="font-family:var(--font-ui);font-size:0.75rem;font-weight:600;color:var(--color-text-secondary);margin-bottom:0.3rem;">
          ${monthLabel}
        </div>
        <div class="habit-grid">
          ${daysHtml}
        </div>
      </div>
    `;
  });

  // ==========================================
  // HEADER HABIT
  // ==========================================
  return `
    <div class="habit-wrapper" data-habit-id="${habit.id}" style="margin-bottom:1.2rem;background:var(--color-bg-card);border-radius:var(--radius-card);padding:1rem 1.2rem;border:1px solid var(--color-border);">
      <div class="habit-grid-header">
        <div>
          <h4 style="margin:0;font-family:var(--font-ui);font-size:0.95rem;font-weight:600;color:var(--color-text-primary);">
            ${habit.name}
          </h4>
          <div style="font-size:0.7rem;color:var(--color-text-muted);margin-top:0.1rem;">
            ${totalDays} hari tercatat
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <div class="streak-count" style="font-family:var(--font-ui);font-size:0.8rem;color:var(--color-primary);font-weight:600;">
            🔥 ${streak} hari
          </div>
          <div style="display:flex;gap:0.3rem;">
            <button class="btn btn-ghost btn-sm" data-action="edit-habit" data-id="${habit.id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete-habit" data-id="${habit.id}" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div style="margin-top:0.5rem;">
        ${monthsHtml}
      </div>

      <!-- Legend kecil -->
      <div style="display:flex;gap:0.8rem;margin-top:0.5rem;font-size:0.65rem;color:var(--color-text-muted);">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--color-border);border-radius:4px;vertical-align:middle;margin-right:0.2rem;"></span> Belum</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--color-primary);border-radius:4px;vertical-align:middle;margin-right:0.2rem;"></span> Dilakukan</span>
        <span><span style="display:inline-block;width:12px;height:12px;outline:2px solid var(--color-primary-dark);outline-offset:2px;border-radius:4px;vertical-align:middle;margin-right:0.2rem;"></span> Hari ini</span>
      </div>
    </div>
  `;
}

// ==========================================
// FUNGSI PEMBANTU
// ==========================================

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  return new Date(year, month - 1, 1).getDay();
}

function calculateStreak(logs) {
  // Hitung streak dari logs (dari hari ini ke belakang)
  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);
  
  // Loop ke belakang sampai menemukan hari yang tidak dilakukan
  while (true) {
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

// ==========================================
// EVENT DELEGATION HELPER
// ==========================================

/**
 * Pasang event listener untuk toggle habit dan tombol aksi
 * @param {HTMLElement} container - Elemen induk yang berisi habit grid
 * @param {Object} handlers
 * @param {function} handlers.onToggle - (habitId, date, isDone) => void
 * @param {function} handlers.onEdit - (habitId) => void
 * @param {function} handlers.onDelete - (habitId) => void
 */
export function attachHabitEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    // Cek apakah klik pada kotak habit-day (bukan empty)
    const dayEl = e.target.closest('.habit-day:not(.empty)');
    if (dayEl) {
      const habitId = dayEl.dataset.habitId;
      const date = dayEl.dataset.date;
      const isDone = dayEl.dataset.done === 'true';
      if (habitId && date) {
        e.preventDefault();
        if (handlers.onToggle) handlers.onToggle(habitId, date, isDone);
      }
      return;
    }

    // Cek tombol aksi
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;
    e.preventDefault();

    switch (action) {
      case 'edit-habit':
        if (handlers.onEdit) handlers.onEdit(id);
        break;
      case 'delete-habit':
        if (handlers.onDelete) handlers.onDelete(id);
        break;
      default:
        break;
    }
  });
}