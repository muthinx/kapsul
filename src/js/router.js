// ==========================================
// ROUTER.JS - NAVIGASI SPA UNTUK KAPSUL
// ==========================================

// ==========================================
// 1. KONFIGURASI ROUTE
// ==========================================
const routes = {
  dashboard: {
    title: 'Dashboard',
    page: 'dashboard',
    path: '/index.html'
  },
  diary: {
    title: 'Diary',
    page: 'diary',
    path: '/'
  },
  todo: {
    title: 'To-Do List',
    page: 'todo',
    path: '/'
  },
  tulisan: {
    title: 'Tulisan',
    page: 'tulisan',
    path: '/'
  },
  habit: {
    title: 'Habit',
    page: 'habit',
    path: '/'
  }
};

// ==========================================
// 2. STATE ROUTER
// ==========================================
let currentPage = null;

// ==========================================
// 3. FUNGSI NAVIGASI UTAMA
// ==========================================
export async function navigateTo(page, force = false) {
  if (!routes[page]) {
    console.error(`[Router] Halaman "${page}" tidak ditemukan`);
    return;
  }

  // Jika force = true, lewati pengecekan currentPage
  if (!force && currentPage === page) {
    console.log(`[Router] Sudah di halaman "${page}", skip`);
    return;
  }

  currentPage = page;
  const route = routes[page];
  const contentEl = document.getElementById('content');

  if (!contentEl) {
    console.error('[Router] Elemen #content tidak ditemukan');
    return;
  }

  // Tampilkan loading
  contentEl.innerHTML = `
    <div class="loader-wrapper">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Memuat ${route.title.toLowerCase()}...</p>
    </div>
  `;

  // Update judul halaman
  const pageTitleEl = document.getElementById('page-title');
  if (pageTitleEl) {
    pageTitleEl.textContent = route.title;
  }

  // Update URL
  let newUrl = route.path;
  if (window.history && window.history.pushState) {
    window.history.pushState({ page: page }, route.title, newUrl);
  }

  // Update menu aktif
  updateActiveMenu(page);

  try {
    const module = await import(`../pages/${page}.js`);

    if (typeof module.render !== 'function') {
      throw new Error(`File ${page}.js tidak mengekspor fungsi render()`);
    }

    const htmlContent = await module.render();
    contentEl.innerHTML = htmlContent;

    // Update sidebar kanan
    import('../js/main.js').then(main => {
      if (main.updateRightPanel) {
        main.updateRightPanel();
      }
    });

    // Panggil init event khusus halaman jika ada
    if (typeof module.init === 'function') {
      setTimeout(() => {
        module.init();
      }, 50);
    }

    console.log(`[Router] Navigasi ke "${page}" berhasil (URL: ${newUrl})`);
  } catch (error) {
    console.error(`[Router] Gagal memuat halaman "${page}":`, error);
    contentEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat halaman</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==========================================
// 4. UPDATE MENU AKTIF
// ==========================================
function updateActiveMenu(page) {
  document.querySelectorAll('#sidebar .nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  document.querySelectorAll('#bottom-nav .bottom-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
}

// ==========================================
// 5. HANDLE NAVIGASI DARI KLIK MENU
// ==========================================
function handleNavigationClick(e) {
  const navItem = e.target.closest('[data-page]');
  if (!navItem) return;

  const page = navItem.dataset.page;
  e.preventDefault();
  navigateTo(page);
}

// ==========================================
// 6. HANDLE POPSTATE (BACK/FORWARD)
// ==========================================
function handlePopState(e) {
  const state = e.state;
  if (state && state.page) {
    navigateTo(state.page);
    return;
  }

  const path = window.location.pathname;
  let page = 'dashboard';
  for (const [key, route] of Object.entries(routes)) {
    if (route.path === path) {
      page = key;
      break;
    }
  }
  navigateTo(page);
}

// ==========================================
// 7. INISIALISASI ROUTER
// ==========================================
export function initRouter() {
  if (window.__routerInitialized) {
    document.removeEventListener('click', handleNavigationClick);
    window.removeEventListener('popstate', handlePopState);
  }

  document.addEventListener('click', handleNavigationClick);
  window.addEventListener('popstate', handlePopState);

  const currentPath = window.location.pathname;
  let initialPage = 'dashboard';
  for (const [key, route] of Object.entries(routes)) {
    if (route.path === currentPath) {
      initialPage = key;
      break;
    }
  }

  if (!routes[initialPage]) {
    initialPage = 'dashboard';
  }

  const route = routes[initialPage];
  window.history.replaceState({ page: initialPage }, route.title, route.path);
  currentPage = initialPage;
  navigateTo(initialPage);

  window.__routerInitialized = true;
  console.log('[Router] Router initialized');
}

// ==========================================
// 8. CLEANUP
// ==========================================
export function destroyRouter() {
  document.removeEventListener('click', handleNavigationClick);
  window.removeEventListener('popstate', handlePopState);
  window.__routerInitialized = false;
  currentPage = null;
  console.log('[Router] Router destroyed');
}