// ==========================================
// DIARY.JS - HALAMAN JURNAL PRIBADI KAPSUL
// Terintegrasi dengan diary-card.js & loader.js
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
import { renderDiaryCard, attachDiaryCardEvents } from '../components/diary-card.js';
import { showFullscreenLoader, hideFullscreenLoader, renderSkeletonCards } from '../components/loader.js';
import { getLocalDateString } from '../utils/date-helper.js';

// ==========================================
// 1. STATE
// ==========================================
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

  try {
    // Ambil semua diary user, urutkan dari yang terbaru
    const diaryRef = collection(db, 'users', uid, 'diary');
    const q = query(diaryRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const diaries = [];
    snapshot.forEach(doc => {
      diaries.push({ id: doc.id, ...doc.data() });
    });

    // ==========================================
    // 3. RENDER DAFTAR DIARY
    // ==========================================
    let diaryListHtml = '';

    if (diaries.length === 0) {
      diaryListHtml = `
        <div class="empty-state">
          <i class="fas fa-book-open"></i>
          <h3>Belum ada catatan</h3>
          <p>Mulai tulis diary pertamamu sekarang!</p>
          <button class="btn btn-primary" onclick="window.__openDiaryModal()">
            <i class="fas fa-plus"></i> Tulis Diary
          </button>
        </div>
      `;
    } else {
      // Gunakan komponen diary-card untuk setiap entri
      diaryListHtml = diaries.map(diary => {
        return renderDiaryCard(diary, {
          showActions: true,
          isCompact: false,
          onEdit: (id) => window.__editDiary(id),
          onDelete: (id) => window.__deleteDiary(id),
          onReply: (id) => window.__replyDiary(id)
        });
      }).join('');
    }

    return `
      <div class="diary-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.8rem;">
          <div>
            <p style="color:var(--color-text-secondary);font-size:0.9rem;margin:0;">
              <i class="fas fa-book"></i> ${diaries.length} entri
            </p>
          </div>
          <button class="btn btn-primary" onclick="window.__openDiaryModal()">
            <i class="fas fa-plus"></i> Tulis Baru
          </button>
        </div>

        <!-- Daftar Diary -->
        <div id="diary-list">
          ${diaryListHtml}
        </div>

        <!-- Modal untuk Tambah/Edit -->
        <div id="diary-modal-container"></div>
      </div>
    `;

  } catch (error) {
    console.error('[Diary] Error:', error);
    return `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat diary</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 4. INISIALISASI EVENT (dipanggil setelah render)
// ==========================================
export function initDiaryEvents() {
  const container = document.getElementById('diary-list');
  if (!container) return;

  // Pasang event delegation dari komponen
  attachDiaryCardEvents(container, {
    onEdit: (diaryId) => window.__editDiary(diaryId),
    onDelete: (diaryId) => window.__deleteDiary(diaryId),
    onReply: (diaryId) => window.__replyDiary(diaryId)
  });
}

// ==========================================
// 5. FUNGSI CRUD (DIEKSPOS KE WINDOW)
// ==========================================

// 5a. Buka Modal (Tambah / Edit)
window.__openDiaryModal = (editData = null) => {
  const container = document.getElementById('diary-modal-container');
  if (!container) return;

  const isEdit = editData !== null;
  const title = isEdit ? 'Edit Diary' : 'Tulis Diary Baru';
  const submitText = isEdit ? 'Simpan Perubahan' : 'Simpan';

  // Isi form jika edit
  const editTitle = isEdit ? editData.title || '' : '';
  const editContent = isEdit ? editData.content || '' : '';
  const editMood = isEdit ? editData.mood || '📝' : '📝';
  const editWeather = isEdit ? editData.weather || '' : '';
  const editDate = isEdit ? editData.date || getLocalDateString() : getLocalDateString();

  container.innerHTML = `
    <div class="modal-overlay" id="diary-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="window.__closeDiaryModal()">✕</button>
        </div>
        <form id="diary-form">
          <div class="form-group">
            <label class="form-label">Judul (opsional)</label>
            <input type="text" id="diary-title" class="form-input" placeholder="Judul catatan..." value="${editTitle}">
          </div>
          <div class="form-group">
            <label class="form-label">Isi Diary <span style="color:var(--color-accent-danger);">*</span></label>
            <textarea id="diary-content" class="form-textarea" placeholder="Ceritakan harimu..." rows="6">${editContent}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">
            <div class="form-group">
              <label class="form-label">Mood</label>
              <select id="diary-mood" class="form-select">
                <option value="😡" ${editMood === '😡' ? 'selected' : ''}>😡 Sangat Buruk</option>
                <option value="😟" ${editMood === '😟' ? 'selected' : ''}>😟 Buruk</option>
                <option value="😐" ${editMood === '😐' ? 'selected' : ''}>😐 Biasa</option>
                <option value="🙂" ${editMood === '🙂' ? 'selected' : ''}>🙂 Baik</option>
                <option value="😍" ${editMood === '😍' ? 'selected' : ''}>😍 Sangat Baik</option>
                <option value="📝" ${editMood === '📝' ? 'selected' : ''}>📝 Lainnya</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Cuaca (opsional)</label>
              <input type="text" id="diary-weather" class="form-input" placeholder="Cerah, Hujan..." value="${editWeather}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal</label>
            <input type="date" id="diary-date" class="form-input" value="${editDate}">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">
            <i class="fas fa-save"></i> ${submitText}
          </button>
        </form>
      </div>
    </div>
  `;

  currentEditId = isEdit ? editData.id : null;

  document.getElementById('diary-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.__saveDiary();
  });
};

// 5b. Tutup Modal
window.__closeDiaryModal = () => {
  const container = document.getElementById('diary-modal-container');
  if (container) container.innerHTML = '';
  currentEditId = null;
};

// 5c. Simpan Diary (Tambah atau Update)
window.__saveDiary = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  const title = document.getElementById('diary-title').value.trim();
  const content = document.getElementById('diary-content').value.trim();
  const mood = document.getElementById('diary-mood').value;
  const weather = document.getElementById('diary-weather').value.trim();
  const date = document.getElementById('diary-date').value;

  if (!content) {
    alert('Isi diary tidak boleh kosong!');
    return;
  }

  const uid = user.uid;
  const diaryRef = collection(db, 'users', uid, 'diary');

  // Tampilkan loader
  showFullscreenLoader('Menyimpan diary...');

  try {
    if (currentEditId) {
      // EDIT
      const docRef = doc(db, 'users', uid, 'diary', currentEditId);
      await updateDoc(docRef, {
        title: title || 'Catatan Hari Ini',
        content: content,
        mood: mood,
        weather: weather,
        date: date,
        updatedAt: serverTimestamp()
      });
      console.log('[Diary] Update berhasil:', currentEditId);
    } else {
      // TAMBAH
      await addDoc(diaryRef, {
        title: title || 'Catatan Hari Ini',
        content: content,
        mood: mood,
        weather: weather,
        date: date,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[Diary] Tambah berhasil');
    }

    window.__closeDiaryModal();
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Diary] Gagal menyimpan:', error);
    hideFullscreenLoader();
    alert('Gagal menyimpan diary: ' + error.message);
  }
};

// 5d. Edit Diary (buka modal dengan data)
window.__editDiary = async (diaryId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'diary', diaryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      window.__openDiaryModal({ id: diaryId, ...data });
    } else {
      alert('Data diary tidak ditemukan');
    }
  } catch (error) {
    console.error('[Diary] Gagal mengambil data:', error);
    alert('Gagal memuat data diary');
  }
};

// 5e. Hapus Diary
window.__deleteDiary = async (diaryId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  if (!confirm('Yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.')) {
    return;
  }

  showFullscreenLoader('Menghapus diary...', 'fa-trash');

  try {
    const docRef = doc(db, 'users', user.uid, 'diary', diaryId);
    await deleteDoc(docRef);
    console.log('[Diary] Hapus berhasil:', diaryId);
    hideFullscreenLoader();
    reloadPage();
  } catch (error) {
    console.error('[Diary] Gagal menghapus:', error);
    hideFullscreenLoader();
    alert('Gagal menghapus diary: ' + error.message);
  }
};

// 5f. Balas / Refleksi (placeholder)
window.__replyDiary = (diaryId) => {
  // Untuk MVP, kita bisa membuka modal dengan placeholder di konten
  alert(`Fitur refleksi akan segera hadir! Kamu bisa menambahkan komentar untuk diary ID: ${diaryId}`);
  // Nanti bisa diimplementasikan dengan subkoleksi "replies" di bawah setiap diary
};

// ==========================================
// 6. FUNGSI PEMBANTU
// ==========================================

// Reload halaman setelah operasi CRUD
function reloadPage() {
  import('../js/router.js').then(module => {
    module.navigateTo('diary', true);
  });
}

// ==========================================
// 7. EKSPOS INIT UNTUK DIPANGGIL ROUTER
// ==========================================
// Override render untuk memanggil initDiaryEvents setelah DOM update
const originalRender = render;
render = async function() {
  const result = await originalRender();
  setTimeout(() => {
    initDiaryEvents();
  }, 100);
  return result;
};

export { render as default };