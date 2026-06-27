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
import { showFullscreenLoader, hideFullscreenLoader } from '../components/loader.js';

// ==========================================
// 1. STATE
// ==========================================
let currentFilter = 'all'; // all | draft | published
let currentViewingId = null; // ID artikel yang sedang dibaca

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
    const articleRef = collection(db, 'users', uid, 'articles');
    const q = query(articleRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const articles = [];
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
    });

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
        const dateStr = article.date || getLocalDateString();
        
        // Gunakan excerpt jika ada, jika tidak ambil 100 karakter pertama dari content
        const excerpt = article.excerpt || (article.content || '').substring(0, 100) + '...';

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
            
            <!-- EXCERPT / POTONGAN ARTIKEL -->
            <div class="card-body" style="font-family:var(--font-serif);font-size:0.95rem;color:var(--color-text-secondary);line-height:1.7;margin-bottom:0.5rem;">
              ${excerpt}
            </div>
            
            <div class="card-actions" style="justify-content:space-between;border-top:1px solid var(--color-border);padding-top:0.8rem;margin-top:0.2rem;">
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                ${article.status === 'draft' 
                  ? `<button class="btn btn-success btn-sm" onclick="window.__publishArticle('${article.id}')"><i class="fas fa-check"></i> Terbitkan</button>`
                  : `<button class="btn btn-ghost btn-sm" onclick="window.__unpublishArticle('${article.id}')"><i class="fas fa-undo"></i> Kembalikan ke Draft</button>`
                }
              </div>
              <!-- TOMBOL BACA SELENGKAPNYA -->
              <button class="btn btn-primary btn-sm" onclick="window.__readArticle('${article.id}')">
                <i class="fas fa-book-open"></i> Baca Selengkapnya
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
        
        <!-- Modal untuk Baca Selengkapnya -->
        <div id="article-read-container"></div>
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

  let editData = { title: '', excerpt: '', content: '', tags: '', status: 'draft', date: '' };
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
  const editExcerpt = editData.excerpt || '';
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
          <!-- INPUT EXCERPT (POTONGAN ARTIKEL) -->
          <div class="form-group">
            <label class="form-label">Potongan Artikel (Excerpt)</label>
            <textarea id="article-excerpt" class="form-textarea" placeholder="Tulis cuplikan singkat yang akan tampil di halaman utama..." rows="3" style="min-height:60px;">${editExcerpt}</textarea>
            <small style="color:var(--color-text-muted);font-size:0.7rem;">Akan tampil di card halaman utama bersama judul. Kosongkan jika ingin menggunakan 100 karakter pertama dari isi artikel.</small>
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

  window.__articleEditId = isEdit ? articleId : null;

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
  const excerpt = document.getElementById('article-excerpt').value.trim();
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

  showFullscreenLoader('Menyimpan tulisan...');

  try {
    if (window.__articleEditId) {
      const docRef = doc(db, 'users', uid, 'articles', window.__articleEditId);
      await updateDoc(docRef, {
        title: title,
        excerpt: excerpt || '',
        content: content,
        tags: tags || '',
        date: date,
        status: status,
        updatedAt: serverTimestamp()
      });
      console.log('[Tulisan] Update berhasil:', window.__articleEditId);
    } else {
      await addDoc(articleRef, {
        title: title,
        excerpt: excerpt || '',
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
    hideFullscreenLoader();
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan', true);
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menyimpan:', error);
    hideFullscreenLoader();
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

  showFullscreenLoader('Menghapus tulisan...', 'fa-trash');

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await deleteDoc(docRef);
    console.log('[Tulisan] Hapus berhasil:', articleId);
    hideFullscreenLoader();
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan', true);
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menghapus:', error);
    hideFullscreenLoader();
    alert('Gagal menghapus tulisan: ' + error.message);
  }
};

// 4e. Edit Artikel
window.__editArticle = (articleId) => {
  window.__openArticleModal(articleId);
};

// 4f. Baca Selengkapnya
window.__readArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      alert('Tulisan tidak ditemukan');
      return;
    }

    const article = { id: articleId, ...docSnap.data() };
    currentViewingId = articleId;

    const container = document.getElementById('article-read-container');
    if (!container) return;

    const dateStr = article.date || getLocalDateString();
    const statusBadge = article.status === 'published' 
      ? '<span class="badge badge-published">Terbit</span>'
      : '<span class="badge badge-draft">Draft</span>';

    container.innerHTML = `
      <div class="modal-overlay" id="article-read-modal">
        <div class="modal-content" style="max-width:800px;max-height:90vh;overflow-y:auto;">
          <div class="modal-header">
            <h2 style="font-family:var(--font-serif);font-size:1.6rem;">${article.title || 'Tanpa Judul'}</h2>
            <button class="modal-close" onclick="window.__closeReadArticle()">✕</button>
          </div>
          <div style="margin-bottom:1rem;font-size:0.85rem;color:var(--color-text-secondary);display:flex;gap:0.8rem;flex-wrap:wrap;">
            <span>📅 ${dateStr}</span>
            <span>${statusBadge}</span>
            ${article.tags ? `<span>🏷️ ${article.tags}</span>` : ''}
          </div>
          <div style="font-family:var(--font-serif);font-size:1.05rem;line-height:1.8;color:var(--color-text-primary);white-space:pre-wrap;word-wrap:break-word;">
            ${article.content || ''}
          </div>
          <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--color-border);display:flex;gap:0.8rem;flex-wrap:wrap;">
            ${article.status === 'draft' 
              ? `<button class="btn btn-success btn-sm" onclick="window.__publishArticle('${article.id}'); window.__closeReadArticle();"><i class="fas fa-check"></i> Terbitkan</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="window.__unpublishArticle('${article.id}'); window.__closeReadArticle();"><i class="fas fa-undo"></i> Kembalikan ke Draft</button>`
            }
            <button class="btn btn-ghost btn-sm" onclick="window.__editArticle('${article.id}'); window.__closeReadArticle();">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.__deleteArticle('${article.id}'); window.__closeReadArticle();">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('[Tulisan] Gagal membaca artikel:', error);
    alert('Gagal memuat artikel: ' + error.message);
  }
};

// 4g. Tutup Modal Baca
window.__closeReadArticle = () => {
  const container = document.getElementById('article-read-container');
  if (container) container.innerHTML = '';
  currentViewingId = null;
};

// 4h. Terbitkan Artikel
window.__publishArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  showFullscreenLoader('Menerbitkan tulisan...', 'fa-check');

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await updateDoc(docRef, {
      status: 'published',
      updatedAt: serverTimestamp()
    });
    console.log('[Tulisan] Terbit berhasil:', articleId);
    hideFullscreenLoader();
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan', true);
    });
  } catch (error) {
    console.error('[Tulisan] Gagal menerbitkan:', error);
    hideFullscreenLoader();
    alert('Gagal menerbitkan tulisan: ' + error.message);
  }
};

// 4i. Kembalikan ke Draft
window.__unpublishArticle = async (articleId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu');
    return;
  }

  showFullscreenLoader('Mengembalikan ke draft...', 'fa-undo');

  try {
    const docRef = doc(db, 'users', user.uid, 'articles', articleId);
    await updateDoc(docRef, {
      status: 'draft',
      updatedAt: serverTimestamp()
    });
    console.log('[Tulisan] Kembali draft berhasil:', articleId);
    hideFullscreenLoader();
    import('../js/router.js').then(module => {
      module.navigateTo('tulisan', true);
    });
  } catch (error) {
    console.error('[Tulisan] Gagal mengembalikan draft:', error);
    hideFullscreenLoader();
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

export { render as default };
