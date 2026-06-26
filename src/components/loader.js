// ==========================================
// LOADER.JS - KOMPONEN LOADING UNTUK KAPSUL
// ==========================================

/**
 * Render elemen loading
 * @param {Object} options
 * @param {string} options.message - Pesan loading (opsional)
 * @param {string} options.type - 'inline' (untuk konten) atau 'fullscreen' (untuk overlay)
 * @param {string} options.icon - Ikon Font Awesome (opsional, default 'fa-spinner')
 * @returns {string} HTML loader
 */
export function renderLoader(options = {}) {
  const {
    message = 'Memuat...',
    type = 'inline',
    icon = 'fa-spinner'
  } = options;

  if (type === 'fullscreen') {
    return `
      <div class="loader-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(250,247,240,0.85);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;">
        <div style="font-size:2.8rem;color:var(--color-primary-light);margin-bottom:1rem;">
          <i class="fas ${icon} fa-spin"></i>
        </div>
        <p style="font-family:var(--font-serif);font-size:1.1rem;color:var(--color-text-secondary);">${message}</p>
      </div>
    `;
  }

  // Default: inline loader (sesuai dengan gaya di style.css)
  return `
    <div class="loader-wrapper" style="padding:2rem 0;">
      <i class="fas ${icon} fa-spin"></i>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Tampilkan overlay loader di seluruh layar (disuntikkan ke body)
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} icon - Ikon Font Awesome
 * @returns {HTMLElement} Elemen overlay yang dibuat
 */
export function showFullscreenLoader(message = 'Menyimpan...', icon = 'fa-spinner') {
  // Hapus overlay lama jika ada (mencegah penumpukan)
  const existing = document.getElementById('kapsul-loader-overlay');
  if (existing) existing.remove();

  const overlayHtml = renderLoader({ type: 'fullscreen', message, icon });
  const container = document.createElement('div');
  container.id = 'kapsul-loader-overlay';
  container.innerHTML = overlayHtml;
  document.body.appendChild(container);
  return container;
}

/**
 * Sembunyikan overlay loader
 */
export function hideFullscreenLoader() {
  const existing = document.getElementById('kapsul-loader-overlay');
  if (existing) existing.remove();
}

/**
 * Render skeleton loader untuk daftar kartu (placeholder animasi)
 * Ini memberikan kesan aplikasi cepat dan modern
 * @param {number} count - Jumlah skeleton yang ditampilkan
 * @param {string} type - 'diary' atau 'todo' (untuk variasi ukuran)
 * @returns {string} HTML skeleton
 */
export function renderSkeletonCards(count = 3, type = 'diary') {
  // Definisikan style shimmer sekali di dalam HTML agar tidak perlu import CSS tambahan
  const styleTag = `
    <style>
      .skeleton-card {
        background: var(--color-bg-card);
        border-radius: var(--radius-card);
        padding: ${type === 'todo' ? '0.6rem 1rem' : '1rem 1.5rem'};
        margin-bottom: ${type === 'todo' ? '0.4rem' : '1rem'};
        border: 1px solid var(--color-border);
        box-shadow: var(--shadow-card);
      }
      .skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, var(--color-border) 25%, var(--color-bg-main) 50%, var(--color-border) 75%);
        background-size: 200% 100%;
        border-radius: 6px;
        animation: skeleton-shimmer 1.8s ease-in-out infinite;
        margin-bottom: 0.5rem;
      }
      .skeleton-line:last-child {
        margin-bottom: 0;
      }
      @keyframes skeleton-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      /* Variasi untuk todo (lebih pendek dan compact) */
      .skeleton-todo {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.6rem 0.8rem;
        margin-bottom: 0.4rem;
        background: var(--color-bg-card);
        border-radius: var(--radius-btn);
        border: 1px solid var(--color-border);
      }
      .skeleton-todo .skeleton-line {
        margin-bottom: 0;
        flex: 1;
      }
      .skeleton-todo .skeleton-check {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--color-border);
        flex-shrink: 0;
        animation: skeleton-shimmer 1.8s ease-in-out infinite;
      }
      .skeleton-todo .skeleton-deadline {
        width: 80px;
        height: 12px;
        border-radius: 4px;
        background: var(--color-border);
        flex-shrink: 0;
        animation: skeleton-shimmer 1.8s ease-in-out infinite;
      }
    </style>
  `;

  let skeletons = '';

  if (type === 'todo') {
    // Skeleton khusus To-Do (lebih compact)
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="skeleton-todo">
          <div class="skeleton-check"></div>
          <div class="skeleton-line" style="height:16px;"></div>
          <div class="skeleton-deadline"></div>
        </div>
      `;
    }
    return styleTag + `<div style="padding:0.5rem 0;">${skeletons}</div>`;
  }

  // Default: Skeleton kartu diary/blog
  for (let i = 0; i < count; i++) {
    skeletons += `
      <div class="skeleton-card">
        <div class="skeleton-line" style="width:60%;height:20px;margin-bottom:0.8rem;"></div>
        <div class="skeleton-line" style="width:30%;height:12px;margin-bottom:0.8rem;"></div>
        <div class="skeleton-line" style="width:100%;height:60px;"></div>
        <div class="skeleton-line" style="width:40%;height:12px;margin-top:0.5rem;margin-bottom:0;"></div>
      </div>
    `;
  }
  return styleTag + `<div style="padding:0.5rem 0;">${skeletons}</div>`;
}