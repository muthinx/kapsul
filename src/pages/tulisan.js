// ==========================================
// TULISAN.JS - HALAMAN BLOG PRIBADI KAPSUL
// ==========================================

import { auth, db } from '../js/firebase-init.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { getLocalDateString } from '../utils/date-helper.js';

// ==========================================
// 1. STATE
// ==========================================
let currentFilter = 'all'; // all | draft | published

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
    // Ambil semua tulisan user, urutkan dari yang terbaru
    const articleRef = collection(db, 'users', uid, 'articles');
    const q = query(articleRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const articles = [];
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
    });

    // Filter berdasarkan status
    let filteredArticles = articles;
    if (currentFilter === 'draft') {
      filteredArticles = articles.filter(a => a.status === 'draft');
    } else if (currentFilter === 'published') {
      filteredArticles = articles.filter(a => a.status === 'published');
    }

    // ==========================================
    // 3. RENDER HTML
    // ==========================================
    const filterHtml = `
      <div style="display:flex;gap:0.5rem;margin-bottom:1.2rem;flex-wrap:wrap;">
        <button class="btn ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-filter="all">
          Semua (${articles.length})
        </button>
        <button class="btn ${currentFilter === 'published' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-filter="published">
          📗 Terbit (${articles.filter(a => a.status === 'published').length})
        </button>
        <button class="btn ${currentFilter === 'draft' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-filter="draft">
          📝 Draft (${articles.filter(a => a.status === 'draft').length})
        </button>
      </div>
    `;

    let listHtml = '';
    if (filteredArticles.length === 0) {
      listHtml = `
        <div class="empty-state">
          <i class="fas fa-pen-fancy"></i>
          <h3>Belum ada tulisan</h3>
          <p>Mulai menulis artikel atau pemikiran panjangmu.</p>
          <button class="btn btn-primary" onclick="window.__openArticleModal()">
            <i class="fas fa-plus"></i> Tulis Baru
          </button>
        </div>
      `;
    } else {
      listHtml = filteredArticles.map(article => {
        const statusBadge = article.status === 'published' 
          ? '<span class="badge badge-published">Terbit</span>'
          : '<span class="badge badge-draft">Draft</span>';
        const dateStr = article.date || new Date(article.createdAt?.toDate?.() || Date.now()).toISOString().split('T')[0];

        return `
          <div class="card article-card" data-id="${article.id}" style="margin-bottom:1rem;">
            <div class="card-header">
              <div style="flex:1;">
                <div class="card-title" style="font-size:1.2rem;">${article.title || 'Tanpa Judul'}</div>
                <div class="card-meta">
                  <span>📅 ${dateStr}</span>
                  <span>•</span>
                  <span>${statusBadge}</span>
                  ${article.tags ? `<span>• 🏷️ ${article.tags}</span>` : ''}
                </div>
              </div>
              <div style="display:flex;gap:0.4rem;flex-shrink:0;">
                <button class="btn btn-ghost btn-sm" onclick="window.__editArticle('${article.id}')" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.__deleteArticle('${article.id}')" title="Hapus">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="card-body" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-family:var(--font-serif);font-size:0.95rem;color:var(--color-text-secondary);">
              ${article.content || ''}
            </div>
            <div class="card-actions">
              ${article.status === 'draft' 
                ? `<button class="btn btn-success btn-sm" onclick="window.__publishArticle('${article.id}')"><i class="fas fa-check"></i> Terbitkan</button>`
                : `<button class="btn btn-ghost btn-sm" onclick="window.__unpublishArticle('${article.id}')"><i class="fas fa-undo"></i> Kembalikan ke Draft</button>`
              }
              <button class="btn btn-ghost btn-sm" onclick="window.__openArticleModal('${article.id}')">
                <i class="fas fa-edit"></i> Edit
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="articles-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;flex-wrap:wrap;gap:0.8rem;">
          <p style="color:var(--color-text-secondary);font-size:0.9rem;margin:0;">
            <i class="fas fa-pen-fancy"></i> ${articles.length} tulisan
          </p>
          <button class="btn btn-primary" onclick="window.__openArticleModal()">
            <i class="fas fa-plus"></i> Tulis Baru
          </button>
        </div>

        ${filterHtml}

        <div id="article-list">
          ${listHtml}
        </div>

        <!-- Modal untuk Tambah/Edit -->
        <div id="article-modal-container"></div>
      </div>
    `;

  } catch (error) {
    console.error('[Tulisan] Error:', error);
    return `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat tulisan</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 4. FUNGSI CRUD (DIEKSPOS KE WINDOW)
// ==========================================

// 4a. Buka Modal Tambah/Edit
window.__openArticleModal = async (articleId = null) => {
  const container = document.getElementById('article-modal-container');
  if (!container) return;

  const isEdit = articleId !== null;
  const title = isEdit ? 'Edit Tulisan' : 'Tulis Artikel Baru';
  const submitText = isEdit ? 'Simpan Perubahan' : 'Simpan';

  let editData = { title: '', content: '', tags: '', status: 'draft', date: '' };
  if (isEdit) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Belum login');
      const docRef = doc(db, 'users', user.uid, 'articles', articleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        editData = { id: articleId, ...docSnap.data() };
      } else {
        alert('Tulisan tidak ditemukan');
        return;
      }
    } catch (error) {
      console.error('[Tulisan] Gagal mengambil data:', error);
      alert('Gagal memuat data tulisan');
      return;
    }
  }

  const editTitle = editData.title || '';
  const editContent = editData.content || '';
  const editTags = editData.tags || '';
  const editStatus = editData.status || 'draft';
  const editDate = editData.date || getLocalDateString();

  container.innerHTML = `
    <div class="modal-overlay" id="article-modal">
      <div class="modal-content" style="max-width:700px;">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="window.__closeArticleModal()">✕</button>
        </div>
        <form id="article-form">
          <div class="form-group">
            <label class="form-label">Judul <span style="color:var(--color-accent-danger);">*</span></label>
            <input type="text" id="article-title" class="form-input" placeholder="Judul tulisan..." value="${editTitle}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Isi Tulisan (Markdown / Teks biasa)</label>
            <textarea id="article-content" class="form-textarea" placeholder="Tulis pemikiranmu di sini..." rows="10">${editContent}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">
            <div class="form-group">
              <label class="form-label">Tag (opsional)</label>
              <input type="text" id="article-tags" class="form-input" placeholder="misal: inspirasi, renungan" value="${editTags}">
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal</label>
              <input type="date" id="article-date" class="form-input" value="${editDate}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="article-status" class="form-select">
              <option value="draft" ${editStatus === 'draft' ? 'selected' : ''}>📝 Draft (hanya terlihat di sini)</option>
              <option value="published" ${editStatus === 'published' ? 'selected' : ''}>📗 Terbit (muncul di Dashboard)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">
            <i class="fas fa-save"></i> ${submitText}
          </button>
        </form>
      </div>
    </div>
  `;

  // Simpan ID edit
  window.__articleEditId = isEdit ? articleId : null;

  // Event submit form
  document.getElementById('article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.__saveArticle();
  });
};

// 4b. Tutup Modal
window.__closeArticleModal = () => {
  const container = document.getElementById('article-modal-container');
  if (container) container.innerHTML = '';
  window.__articleEditId = null;
};

// 4c. Simpan Artikel
window.__saveArticle = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  const title = document.getElementById('article-title').value.trim();
  const content = document.getElementById('article-content').value.trim();
  const tags = document.getElementById('article-tags').value.trim();
  const date = document.getElementById('article-date').value;
  const status = document.getElementById('article-status').value;

  if (!title) {
    alert('Judul tidak boleh kosong!');
    return;
  }
  if (!content) {
    alert('Isi tulisan tidak boleh kosong!');
    return;
  }

  const uid = user.uid;
  const articleRef = collection(db, 'users', uid, 'articles');

  try {
    if (window.__articleEditId) {
      // EDIT
      const docRef = doc(db, 'users', uid, 'articles', window.__articleEditId);
      await updateDoc(docRef, {
        title: title,
        content: content,
        tags: tags || '',
        date: date,
        status: status,
        updatedAt: serverTimestamp()
      });
      console.log('[Tulisan] Update berhasil:', window.__articleEditId);
    } else {
      // TAMBAH
      await addDoc(articleRef, {
        title: title,
        content: content,
        tags: tags || '',
        date: date,
        status: status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[Tulisan] Tambah berhasil');
    }

    window.__closeArticleModal();
    // Reload halaman
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan');
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menyimpan:', error);
    alert('Gagal menyimpan tulisan: ' + error.message);
  }
};

// 4d. Hapus Artikel
window.__deleteArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  if (!confirm('Yakin ingin menghapus tulisan ini? Tindakan ini tidak dapat dibatalkan.')) {
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await deleteDoc(docRef);
    console.log('[Tulisan] Hapus berhasil:', articleId);

    import('../js/router.js').then(module => {
      module.navigateTo('tulisan');
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menghapus:', error);
    alert('Gagal menghapus tulisan: ' + error.message);
  }
};

// 4e. Edit Artikel (buka modal dengan data)
window.__editArticle = async (articleId) => {
  await window.__openArticleModal(articleId);
};

// 4f. Terbitkan Artikel
window.__publishArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await updateDoc(docRef, {
      status: 'published',
      updatedAt: serverTimestamp()
    });
    console.log('[Tulisan] Terbit berhasil:', articleId);

    import('../js/router.js').then(module => {
      module.navigateTo('tulisan');
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menerbitkan:', error);
    alert('Gagal menerbitkan tulisan: ' + error.message);
  }
};

// 4g. Kembalikan ke Draft
window.__unpublishArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await updateDoc(docRef, {
      status: 'draft',
      updatedAt: serverTimestamp()
    });
    console.log('[Tulisan] Kembali draft berhasil:', articleId);

    import('../js/router.js').then(module => {
      module.navigateTo('tulisan');
    });
  } catch (error) {
    console.error('[Tulisan] Gagal mengembalikan draft:', error);
    alert('Gagal mengembalikan ke draft: ' + error.message);
  }
};

// ==========================================
// 5. EVENT DELEGATION UNTUK FILTER
// ==========================================
export function initFilterListeners() {
  if (window.__filterListenerAttached) {
    document.removeEventListener('click', window.__filterClickHandler);
  }

  window.__filterClickHandler = (e) => {
    const filterBtn = e.target.closest('[data-filter]');
    if (!filterBtn) return;

    const filter = filterBtn.dataset.filter;
    if (filter === currentFilter) return;

    currentFilter = filter;
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan', true);
    });
  };

  document.addEventListener('click', window.__filterClickHandler);
  window.__filterListenerAttached = true;
}

// Override render untuk memanggil initFilterListeners
const originalRender = render;
render = async function() {
  const result = await originalRender();
  setTimeout(() => {
    initFilterListeners();
  }, 100);
  return result;
};