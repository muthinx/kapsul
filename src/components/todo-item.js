// ==========================================
// TODO-ITEM.JS - KOMPONEN ITEM TO-DO
// Digunakan di halaman To-Do List dan Dashboard
// ==========================================

/**
 * Render satu item to-do
 * @param {Object} todo - Data todo dari Firestore
 * @param {string} todo.id - ID dokumen
 * @param {string} todo.title - Nama tugas
 * @param {string} todo.deadline - Deadline (YYYY-MM-DD)
 * @param {string} todo.priority - 'normal' | 'urgent'
 * @param {boolean} todo.done - Status selesai
 * @param {Object} todo.createdAt - Firestore Timestamp
 * @param {Object} todo.updatedAt - Firestore Timestamp
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.isCompact - Mode ringkas (untuk dashboard)
 * @param {boolean} options.showDelete - Tampilkan tombol hapus
 * @param {function} options.onToggle - Callback saat checkbox diklik
 * @param {function} options.onDelete - Callback saat tombol hapus diklik
 * @param {function} options.onEdit - Callback saat tombol edit diklik
 * @returns {string} HTML item to-do
 */
export function renderTodoItem(todo, options = {}) {
  const {
    isCompact = false,
    showDelete = true,
    onToggle = null,
    onDelete = null,
    onEdit = null
  } = options;

  // Data dasar
  const isUrgent = todo.priority === 'urgent';
  const isCompleted = todo.done === true;
  const todayString = new Date().toISOString().split('T')[0];
  const isOverdue = todo.deadline && todo.deadline < todayString && !isCompleted;
  
  // Format deadline
  let deadlineLabel = '';
  if (todo.deadline) {
    deadlineLabel = formatDate(todo.deadline);
    if (isOverdue) {
      deadlineLabel = `⚠️ Terlambat (${deadlineLabel})`;
    }
  }

  const dataId = todo.id || '';

  // Mode ringkas (untuk dashboard)
  if (isCompact) {
    return `
      <div class="todo-item ${isCompleted ? 'done' : ''}" data-id="${dataId}" style="padding:0.4rem 0.6rem;">
        <div class="checkbox-custom ${isCompleted ? 'checked' : ''}" data-action="toggle-todo" data-id="${dataId}">
          ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <span class="todo-label">${todo.title || 'Tugas'}</span>
        ${isUrgent ? ' <span class="badge badge-urgent">Urgent</span>' : ''}
      </div>
    `;
  }

  // Mode lengkap (untuk halaman To-Do)
  return `
    <div class="todo-item ${isCompleted ? 'done' : ''}" data-id="${dataId}">
      <div class="checkbox-custom ${isCompleted ? 'checked' : ''}" data-action="toggle-todo" data-id="${dataId}">
        ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
      </div>
      <span class="todo-label">${todo.title || 'Tugas tanpa judul'}</span>
      <span class="todo-deadline ${isOverdue ? 'urgent' : ''}">
        ${deadlineLabel}
        ${isUrgent && !isCompleted ? ' <span class="badge badge-urgent">Urgent</span>' : ''}
      </span>
      ${showDelete ? `
        <button class="todo-delete" data-action="delete-todo" data-id="${dataId}" title="Hapus">
          <i class="fas fa-times"></i>
        </button>
      ` : ''}
    </div>
  `;
}

// ==========================================
// FUNGSI PEMBANTU
// ==========================================

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

// ==========================================
// EVENT DELEGATION HELPER (SATU LISTENER)
// ==========================================

/**
 * Pasang event listener untuk semua aksi di item to-do
 * @param {HTMLElement} container - Elemen induk yang berisi item-item to-do
 * @param {Object} handlers
 * @param {function} handlers.onToggle - (todoId) => void
 * @param {function} handlers.onDelete - (todoId) => void
 * @param {function} handlers.onEdit - (todoId) => void
 */
export function attachTodoItemEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    // Cari apakah klik terjadi pada elemen dengan data-action
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();

      switch (action) {
        case 'toggle-todo':
          if (handlers.onToggle) handlers.onToggle(id);
          break;
        case 'delete-todo':
          if (handlers.onDelete) handlers.onDelete(id);
          break;
        default:
          break;
      }
      return; // sudah ditangani
    }

    // Jika klik pada label (bukan di dalam checkbox/delete)
    const label = e.target.closest('.todo-label');
    if (label) {
      const item = label.closest('.todo-item');
      if (!item) return;
      const id = item.dataset.id;
      if (!id) return;
      // Pastikan tidak klik di dalam checkbox atau tombol hapus (tapi sudah ter-filter di atas)
      if (e.target.closest('.checkbox-custom') || e.target.closest('.todo-delete')) return;
      e.preventDefault();
      if (handlers.onEdit) handlers.onEdit(id);
    }
  });
}

// ==========================================
// GROUPING UTILITY (EXPORT)
// ==========================================

/**
 * Kelompokkan todo berdasarkan status dan deadline
 * @param {Array} todos - Array todo
 * @param {string} todayString - Tanggal hari ini (YYYY-MM-DD)
 * @returns {Object} { today, upcoming, completed }
 */
export function groupTodos(todos, todayString) {
  const today = [];
  const upcoming = [];
  const completed = [];

  todos.forEach(todo => {
    if (todo.done) {
      completed.push(todo);
    } else if (todo.deadline === todayString) {
      today.push(todo);
    } else if (todo.deadline > todayString) {
      upcoming.push(todo);
    } else {
      // Tugas yang deadline-nya sudah lewat tapi belum selesai
      // Masukkan ke "Mendatang" tapi dengan label terlewat
      upcoming.push(todo);
    }
  });

  // Sortir: upcoming berdasarkan deadline terdekat
  upcoming.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  // completed berdasarkan waktu selesai (terbaru di atas)
  completed.sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.() || new Date(0);
    const bTime = b.updatedAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });

  return { today, upcoming, completed };
}