// ==========================================
// TODO.JS - HALAMAN TO-DO LIST KAPSUL
// Terintegrasi dengan todo-item.js & loader.js
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
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import {
  renderTodoItem,
  attachTodoItemEvents,
  groupTodos
} from '../components/todo-item.js';
import { showFullscreenLoader, hideFullscreenLoader } from '../components/loader.js';
import { getLocalDateString } from '../utils/date-helper.js';

// ==========================================
// 1. STATE
// ==========================================
let currentTab = 'today'; // today | upcoming | completed
let currentEditId = null;

// ==========================================
// 2. FUNGSI RENDER UTAMA
// ==========================================
export async function render() {
  const user = auth.currentUser;
  if (!user) {
    return `<div class="empty-state"><p>Silakan login terlebih dahulu.</p></div>`;
  }

  const uid = user.uid;
  const todayString = getLocalDateString();

  try {
    // Ambil semua todo user
    const todoRef = collection(db, 'users', uid, 'todos');
    const q = query(todoRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const todos = [];
    snapshot.forEach(doc => {
      todos.push({ id: doc.id, ...doc.data() });
    });

    // Group todos
    const grouped = groupTodos(todos, todayString);
    const { today, upcoming, completed } = grouped;

    // ==========================================
    // 3. RENDER TAB
    // ==========================================
    const tabHtml = `
      <div class="todo-tabs">
        <button class="tab-btn ${currentTab === 'today' ? 'active' : ''}" data-tab="today">
          Hari Ini <span class="badge" style="background:var(--color-primary-bg);color:var(--color-primary);font-size:0.65rem;margin-left:0.3rem;">${today.length}</span>
        </button>
        <button class="tab-btn ${currentTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">
          Mendatang <span class="badge" style="background:var(--color-primary-bg);color:var(--color-primary);font-size:0.65rem;margin-left:0.3rem;">${upcoming.length}</span>
        </button>
        <button class="tab-btn ${currentTab === 'completed' ? 'active' : ''}" data-tab="completed">
          Selesai <span class="badge" style="background:var(--color-bg-sidebar);color:var(--color-text-muted);font-size:0.65rem;margin-left:0.3rem;">${completed.length}</span>
        </button>
      </div>
    `;

    // ==========================================
    // 4. RENDER LIST (pakai komponen)
    // ==========================================
    let listHtml = '';
    let emptyMessage = '';

    const getEmptyState = (icon, title, message, btnText = 'Tambah Tugas') => `
      <div class="empty-state">
        <i class="fas ${icon}"></i>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.__openTodoModal()">
          <i class="fas fa-plus"></i> ${btnText}
        </button>
      </div>
    `;

    if (currentTab === 'today') {
      if (today.length === 0) {
        emptyMessage = getEmptyState(
          'fa-check-circle',
          'Tidak ada tugas hari ini',
          'Semua tugas hari ini sudah selesai atau belum ada jadwal.'
        );
      } else {
        listHtml = today.map(todo =>
          renderTodoItem(todo, {
            isCompact: false,
            showDelete: true,
            onToggle: (id) => window.__toggleTodo(id),
            onDelete: (id) => window.__deleteTodo(id),
            onEdit: (id) => window.__editTodo(id)
          })
        ).join('');
      }
    } else if (currentTab === 'upcoming') {
      if (upcoming.length === 0) {
        emptyMessage = getEmptyState(
          'fa-calendar-alt',
          'Tidak ada tugas mendatang',
          'Semua tugas sudah terjadwal atau belum ada rencana ke depan.'
        );
      } else {
        listHtml = upcoming.map(todo =>
          renderTodoItem(todo, {
            isCompact: false,
            showDelete: true,
            onToggle: (id) => window.__toggleTodo(id),
            onDelete: (id) => window.__deleteTodo(id),
            onEdit: (id) => window.__editTodo(id)
          })
        ).join('');
      }
    } else if (currentTab === 'completed') {
      if (completed.length === 0) {
        emptyMessage = getEmptyState(
          'fa-hourglass-start',
          'Belum ada tugas selesai',
          'Selesaikan tugasmu dan lihat progresnya di sini!',
          'Lihat Tugas Aktif'
        );
      } else {
        listHtml = completed.map(todo =>
          renderTodoItem(todo, {
            isCompact: false,
            showDelete: true,
            onToggle: (id) => window.__toggleTodo(id),
            onDelete: (id) => window.__deleteTodo(id),
            onEdit: (id) => window.__editTodo(id)
          })
        ).join('');
      }
    }

    return `
      <div class="todo-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;flex-wrap:wrap;gap:0.8rem;">
          <p style="color:var(--color-text-secondary);font-size:0.9rem;margin:0;">
            <i class="fas fa-list-check"></i> ${todos.length} total tugas
          </p>
          <button class="btn btn-primary" onclick="window.__openTodoModal()">
            <i class="fas fa-plus"></i> Tambah Tugas
          </button>
        </div>

        ${tabHtml}

        <div id="todo-list">
          ${listHtml || emptyMessage}
        </div>

        <!-- Modal untuk Tambah/Edit -->
        <div id="todo-modal-container"></div>
      </div>
    `;

  } catch (error) {
    console.error('[Todo] Error:', error);
    return `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat daftar tugas</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 5. INISIALISASI EVENT (dipanggil setelah render)
// ==========================================
export function initTodoEvents() {
  const container = document.getElementById('todo-list');
  if (!container) return;

  // Pasang event delegation dari komponen
  attachTodoItemEvents(container, {
    onToggle: (todoId) => window.__toggleTodo(todoId),
    onDelete: (todoId) => window.__deleteTodo(todoId),
    onEdit: (todoId) => window.__editTodo(todoId)
  });
}

// ==========================================
// 6. FUNGSI CRUD (DIEKSPOS KE WINDOW)
// ==========================================

// 6a. Buka Modal (Tambah / Edit)
window.__openTodoModal = (editData = null) => {
  const container = document.getElementById('todo-modal-container');
  if (!container) return;

  const isEdit = editData !== null;
  const title = isEdit ? 'Edit Tugas' : 'Tambah Tugas Baru';
  const submitText = isEdit ? 'Simpan Perubahan' : 'Tambahkan';

  // Isi form jika edit
  const editTitle = isEdit ? editData.title || '' : '';
  const editDeadline = isEdit ? editData.deadline || '' : '';
  const editPriority = isEdit ? editData.priority || 'normal' : 'normal';

  container.innerHTML = `
    <div class="modal-overlay" id="todo-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="window.__closeTodoModal()">✕</button>
        </div>
        <form id="todo-form">
          <div class="form-group">
            <label class="form-label">Nama Tugas <span style="color:var(--color-accent-danger);">*</span></label>
            <input type="text" id="todo-title" class="form-input" placeholder="Apa yang harus dilakukan?" value="${editTitle}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Deadline</label>
            <input type="date" id="todo-deadline" class="form-input" value="${editDeadline}">
          </div>
          <div class="form-group">
            <label class="form-label">Prioritas</label>
            <select id="todo-priority" class="form-select">
              <option value="normal" ${editPriority === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="urgent" ${editPriority === 'urgent' ? 'selected' : ''}>⚠️ Urgent (tampil di Dashboard)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">
            <i class="fas fa-save"></i> ${submitText}
          </button>
        </form>
      </div>
    </div>
  `;

  currentEditId = isEdit ? editData.id : null;

  document.getElementById('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.__saveTodo();
  });
};

// 6b. Tutup Modal
window.__closeTodoModal = () => {
  const container = document.getElementById('todo-modal-container');
  if (container) container.innerHTML = '';
  currentEditId = null;
};

// 6c. Simpan Todo (Tambah atau Update)
window.__saveTodo = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  const title = document.getElementById('todo-title').value.trim();
  const deadline = document.getElementById('todo-deadline').value;
  const priority = document.getElementById('todo-priority').value;

  if (!title) {
    alert('Nama tugas tidak boleh kosong!');
    return;
  }

  const uid = user.uid;
  const todoRef = collection(db, 'users', uid, 'todos');

  // Tampilkan loader
  showFullscreenLoader('Menyimpan tugas...');

  try {
    if (currentEditId) {
      // EDIT
      const docRef = doc(db, 'users', uid, 'todos', currentEditId);
      await updateDoc(docRef, {
        title: title,
        deadline: deadline || null,
        priority: priority,
        updatedAt: serverTimestamp()
      });
      console.log('[Todo] Update berhasil:', currentEditId);
    } else {
      // TAMBAH
      await addDoc(todoRef, {
        title: title,
        deadline: deadline || null,
        priority: priority,
        done: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[Todo] Tambah berhasil');
    }

    window.__closeTodoModal();
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Todo] Gagal menyimpan:', error);
    hideFullscreenLoader();
    alert('Gagal menyimpan tugas: ' + error.message);
  }
};

// 6d. Toggle Status (Selesai / Batal Selesai)
window.__toggleTodo = async (todoId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  showFullscreenLoader('Memperbarui tugas...', 'fa-sync');

  try {
    const docRef = doc(db, 'users', user.uid, 'todos', todoId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      alert('Tugas tidak ditemukan');
      hideFullscreenLoader();
      return;
    }

    const currentData = docSnap.data();
    const newDone = !currentData.done;

    await updateDoc(docRef, {
      done: newDone,
      updatedAt: serverTimestamp()
    });

    console.log(`[Todo] Toggle ${todoId} -> ${newDone ? 'Selesai' : 'Belum selesai'}`);
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Todo] Gagal toggle:', error);
    hideFullscreenLoader();
    alert('Gagal mengubah status tugas: ' + error.message);
  }
};

// 6e. Edit Todo (buka modal dengan data)
window.__editTodo = async (todoId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'todos', todoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      window.__openTodoModal({ id: todoId, ...data });
    } else {
      alert('Data tugas tidak ditemukan');
    }
  } catch (error) {
    console.error('[Todo] Gagal mengambil data:', error);
    alert('Gagal memuat data tugas');
  }
};

// 6f. Hapus Todo
window.__deleteTodo = async (todoId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  if (!confirm('Yakin ingin menghapus tugas ini?')) {
    return;
  }

  showFullscreenLoader('Menghapus tugas...', 'fa-trash');

  try {
    const docRef = doc(db, 'users', user.uid, 'todos', todoId);
    await deleteDoc(docRef);
    console.log('[Todo] Hapus berhasil:', todoId);
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Todo] Gagal menghapus:', error);
    hideFullscreenLoader();
    alert('Gagal menghapus tugas: ' + error.message);
  }
};

// ==========================================
// 7. FUNGSI PEMBANTU
// ==========================================

// Reload halaman setelah operasi CRUD
function reloadPage() {
  import('../js/router.js').then(module => {
    module.navigateTo('todo');
  });
}

// ==========================================
// 8. EVENT DELEGATION UNTUK TAB
// ==========================================
export function initTabListeners() {
  if (window.__tabListenerAttached) {
    document.removeEventListener('click', window.__tabClickHandler);
  }

  window.__tabClickHandler = (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;
    if (!tabBtn.dataset.tab) return;

    const tab = tabBtn.dataset.tab;
    if (tab === currentTab) return;

    currentTab = tab;
    // Gunakan force = true agar reload halaman
    import('../js/router.js').then(module => {
      module.navigateTo('todo', true);
    });
  };

  document.addEventListener('click', window.__tabClickHandler);
  window.__tabListenerAttached = true;
}

// ==========================================
// 9. OVERRIDE RENDER UNTUK INIT EVENT
// ==========================================
const originalRender = render;
render = async function() {
  const result = await originalRender();
  setTimeout(() => {
    initTodoEvents();
    initTabListeners();
  }, 100);
  return result;
};

export { render as default };