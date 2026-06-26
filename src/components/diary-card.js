// ==========================================
// DIARY-CARD.JS - KOMPONEN KARTU DIARY
// Digunakan di halaman Diary dan Dashboard
// ==========================================

/**
 * Render satu kartu diary
 * @param {Object} diary - Data diary dari Firestore
 * @param {string} diary.id - ID dokumen
 * @param {string} diary.title - Judul
 * @param {string} diary.content - Isi diary
 * @param {string} diary.mood - Emoji mood
 * @param {string} diary.weather - Cuaca (opsional)
 * @param {string} diary.date - Tanggal (YYYY-MM-DD)
 * @param {Object} diary.createdAt - Firestore Timestamp
 * @param {Object} diary.updatedAt - Firestore Timestamp
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.showActions - Tampilkan tombol aksi (edit/hapus)
 * @param {boolean} options.isCompact - Mode ringkas (untuk dashboard)
 * @param {function} options.onEdit - Callback saat tombol edit diklik
 * @param {function} options.onDelete - Callback saat tombol hapus diklik
 * @param {function} options.onReply - Callback saat tombol balas diklik
 * @returns {string} HTML kartu diary
 */
export function renderDiaryCard(diary, options = {}) {
  const {
    showActions = true,
    isCompact = false,
    onEdit = null,
    onDelete = null,
    onReply = null
  } = options;

  // Data dasar
  const moodEmoji = diary.mood || '📝';
  const weather = diary.weather ? `🌤️ ${diary.weather}` : '';
  const dateStr = diary.date || formatDate(diary.createdAt);
  const timeStr = diary.createdAt?.toDate 
    ? new Date(diary.createdAt.toDate()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  const borderColor = getColorByMood(diary.mood);

  // ID unik untuk event (jika pakai data attribute)
  const dataId = diary.id || '';

  // Mode ringkas (untuk dashboard): hanya tampilkan cuplikan
  let contentPreview = diary.content || '';
  if (isCompact && contentPreview.length > 120) {
    contentPreview = contentPreview.substring(0, 120) + '...';
  }

  // ==========================================
  // GENERATE HTML
  // ==========================================
  return `
    <div class="card diary-card" data-id="${dataId}" style="border-left-color:${borderColor}; ${isCompact ? 'padding:0.8rem 1rem;' : ''}">
      <div class="card-header">
        <div style="flex:1;">
          <div class="card-title" style="font-size:${isCompact ? '1rem' : '1.05rem'};">
            ${diary.title || 'Catatan Hari Ini'}
          </div>
          <div class="card-meta">
            <span>${moodEmoji}</span>
            <span>${dateStr}</span>
            ${timeStr ? `<span>• ${timeStr}</span>` : ''}
            ${weather ? `<span>• ${weather}</span>` : ''}
          </div>
        </div>
        ${showActions ? `
          <div style="display:flex;gap:0.4rem;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm" data-action="edit-diary" data-id="${dataId}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete-diary" data-id="${dataId}" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="card-body" style="${isCompact ? 'margin:0.3rem 0 0.5rem;font-size:0.9rem;' : ''}">
        ${isCompact ? contentPreview : (diary.content || '')}
      </div>
      
      ${showActions ? `
        <div class="card-actions" style="border-top:none;padding-top:0.2rem;margin-top:0.2rem;">
          <button class="btn btn-ghost btn-sm" data-action="reply-diary" data-id="${dataId}" style="color:var(--color-text-muted);">
            <i class="fas fa-reply"></i> Balas (refleksi)
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// ==========================================
// FUNGSI PEMBANTU
// ==========================================

function getColorByMood(mood) {
  const moodMap = {
    '😡': '#d97070',
    '😟': '#e6a15e',
    '😐': '#b0b0b0',
    '🙂': '#7aaf8a',
    '😍': '#5a8f6a',
    '📝': '#6b6b6b'
  };
  return moodMap[mood] || '#5a8f6a';
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// ==========================================
// EVENT DELEGATION HELPER
// ==========================================

/**
 * Pasang event listener untuk tombol-tombol di kartu diary
 * Gunakan event delegation di container
 * @param {HTMLElement} container - Elemen induk yang berisi kartu-kartu diary
 * @param {Object} handlers - Objek berisi fungsi-fungsi handler
 * @param {function} handlers.onEdit - (diaryId) => void
 * @param {function} handlers.onDelete - (diaryId) => void
 * @param {function} handlers.onReply - (diaryId) => void
 */
export function attachDiaryCardEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    // Cari tombol aksi terdekat
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    e.preventDefault();

    switch (action) {
      case 'edit-diary':
        if (handlers.onEdit) handlers.onEdit(id);
        break;
      case 'delete-diary':
        if (handlers.onDelete) handlers.onDelete(id);
        break;
      case 'reply-diary':
        if (handlers.onReply) handlers.onReply(id);
        break;
      default:
        break;
    }
  });
}