// Main application bootstrap (non-module script for compatibility)
// Uses dynamic ES module imports for modular architecture.

(function () {
  'use strict';

  function _getStorage() {
    if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
      throw new Error('StorageManager is required and must be available on window.');
    }
    return new window.StorageManager(window.localStorage);
  }

  const storage = _getStorage();

  function _pageName() {
    const p = (window.location.pathname || '').split('/').pop();
    return p || 'index.html';
  }

  function _inScreens() {
    return window.location.pathname.includes('/screens/');
  }

  function _normalizeLinkPath(href) {
    if (!href) return '';
    return href.split('/').pop().split('?')[0].split('#')[0];
  }

  function _activateSidebarNav() {
    const current = _pageName();
    document.querySelectorAll('#sidebar-menu a').forEach(link => {
      const target = _normalizeLinkPath(link.getAttribute('href'));
      link.classList.toggle('active', target === current);
    });
  }

  function _seedIfEmpty() {
    try {
      const hasProducts = storage.getProducts().length > 0;
      const hasCategories = storage.getCategories().length > 0;
      if (!hasProducts || !hasCategories) {
        storage.seedData();
        console.info('Seeded initial categories and products');
      }
    } catch (err) {
      console.warn('Failed to seed data', err);
    }
  }

  // Cart helpers
  function _getCart() {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return [];
    }

    try {
      return JSON.parse(window.localStorage.getItem('cart')) || [];
    } catch (err) {
      console.warn('Failed to parse localStorage cart', err);
      return [];
    }
  }

  function _saveCart(cart) {
    const normalized = Array.isArray(cart) ? cart : [];
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem('cart', JSON.stringify(normalized));
      } catch (err) {
        console.warn('Unable to write cart to localStorage', err);
      }
    }
    if (storage.saveCart) {
      storage.saveCart(normalized);
    }
    _syncCartUI();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
  }

  function _normalizeCartItem(product, qty = 1) {
    return {
      id: product.id,
      productId: product.id,
      name: product.name || product.title || '',
      sku: product.sku || '',
      price: Number(product.price || 0),
      qty: Number(qty || 1),
      image: product.image || (product.images && product.images[0]) || ''
    };
  }

  function addToCart(productId, qty = 1) {
    try {
      const products = storage.getProducts();
      const p = products.find(x => x.id === productId);
      if (!p) throw new Error('Product not found ' + productId);

      let cart = [];
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        cart = JSON.parse(window.localStorage.getItem('cart')) || [];
      }

      const existing = cart.find(i => i.productId === productId);
      if (existing) {
        existing.qty = Number(existing.qty || 1) + Number(qty || 1);
      } else {
        cart.push(_normalizeCartItem(p, qty));
      }

      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem('cart', JSON.stringify(cart));
      }
      _saveCart(cart);
      _notify('Producto añadido al carrito');
    } catch (err) {
      console.error('addToCart failed', err);
    }
  }

  function removeFromCart(productId) {
    const cart = _getCart();
    const next = cart.filter(i => i.productId !== productId);
    _saveCart(next);
  }

  function _cartTotals(cart) {
    const items = cart.reduce((s, it) => s + Number(it.qty || 1), 0);
    const total = cart.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    return { items, total };
  }

  // UI sync: update navbar cart count, summary on cart page, and modal contents
  let _modalCartEl = null;

  function _ensureModalCart() {
    if (_modalCartEl) return _modalCartEl;
    _modalCartEl = document.querySelector('modal-cart');
    if (!_modalCartEl) {
      try {
        _modalCartEl = document.createElement('modal-cart');
        const container = document.getElementById('cart-modal-container') || document.body;
        container.appendChild(_modalCartEl);
      } catch (err) {
        console.warn('Could not create modal-cart element', err);
        _modalCartEl = null;
      }
    }
    return _modalCartEl;
  }

  function _syncCartUI() {
    const cart = _getCart();
    const totals = _cartTotals(cart);

    // update custom navbar if present
    const navComp = document.querySelector('aethon-navbar');
    if (navComp && typeof navComp.setAttribute === 'function') {
      navComp.setAttribute('cart-count', String(totals.items));
    }

    // update any visible cart-count spans
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = String(totals.items); });

    // update header button if present
    document.querySelectorAll('#nav-cart-btn').forEach(el => {
      try {
        el.textContent = `CARRITO (${totals.items})`;
      } catch (e) {}
    });

    // update cart summary on cart page
    const summaryCount = document.getElementById('summary-items-count');
    const summarySubtotal = document.getElementById('summary-subtotal-value');
    const summaryTotal = document.getElementById('summary-total-value');
    if (summaryCount) summaryCount.textContent = String(totals.items);
    if (summarySubtotal) summarySubtotal.textContent = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totals.total || 0);
    if (summaryTotal) summaryTotal.textContent = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totals.total || 0);

    // update modal
    const modal = _ensureModalCart();
    if (modal && typeof modal.update === 'function') {
      const normalized = cart.map(i => ({ productId: i.productId, image: i.image, name: i.name, quantity: i.qty, price: i.price }));
      modal.update(normalized);
    }
  }

  function _notify(message) {
    try {
      // lightweight toast: use console.info; production apps should replace with UI toast
      console.info(message);
    } catch (e) {}
  }

  // Wire global events
  function _wireEvents() {
    // product-card add to cart
    document.body.addEventListener('add-cart', (ev) => {
      const id = ev.detail && ev.detail.productId;
      if (id) addToCart(id, 1);
    });

    // Modal remove item
    document.addEventListener('remove-item', (ev) => {
      const id = ev.detail && ev.detail.productId;
      if (id) removeFromCart(id);
    });

    // Modal checkout -> redirect to cart page
    document.addEventListener('checkout', (ev) => {
      const inScreens = _inScreens();
      const target = inScreens ? 'cart.html' : 'screens/cart.html';
      location.assign(target);
    });

    // Listen to custom element events from navbar component
    document.body.addEventListener('open-cart', () => {
      const modal = _ensureModalCart(); if (modal && typeof modal.open === 'function') modal.open();
    });

    document.body.addEventListener('open-search', () => {
      // focus first visible search input
      const selectors = ['#search-input', '#global-search-input', '#category-search-input'];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) { el.focus(); break; }
      }
    });

    document.body.addEventListener('logout', async () => {
      try { const auth = await import('./auth.js'); auth.logout(); } catch (e) { console.error(e); }
    });

    // modal-cart remove-item event is emitted from within shadow, but it bubbles composed
    document.addEventListener('remove-item', (ev) => {
      const id = ev.detail && ev.detail.productId; if (id) removeFromCart(id);
    });
  }

  // Initialize page-specific modules
  async function _init() {
    _seedIfEmpty();
    _ensureModalCart();
    _wireEvents();
    _syncCartUI();

    const page = _pageName();
    // Dynamically import modules used across pages
    const imports = {};
    try {
      imports.products = await import('./products.js');
    } catch (e) { console.warn('products module not available', e); }
    try {
      imports.categories = await import('./categories.js');
    } catch (e) { console.warn('categories module not available', e); }
    try {
      imports.orders = await import('./orders.js');
    } catch (e) { console.warn('orders module not available', e); }
    try {
      imports.auth = await import('./auth.js');
    } catch (e) { console.warn('auth module not available', e); }

    // Initialize categories UI where applicable (public filters)
    if (imports.categories && typeof imports.categories.populateCategoryFilters === 'function') {
      try { imports.categories.populateCategoryFilters('#category-filter'); } catch (e) {}
    }

    // Initialize products UI
    if (imports.products) {
      try {
        if (page === 'index.html' && typeof imports.products.renderProducts === 'function') {
          imports.products.renderProducts({ mode: 'featured', target: '#featured-products-grid', limit: 4 });
        } else if (page === 'products.html' && typeof imports.products.initProductsUI === 'function') {
          imports.products.initProductsUI({ mode: 'catalog' });
        } else if (page === 'product-detail.html' && typeof imports.products.renderProducts === 'function') {
          const params = new URLSearchParams(window.location.search);
          const id = params.get('id');
          if (id) {
            imports.products.renderProducts({ mode: 'related', relatedToId: id, limit: 4, target: '#related-products-grid' });
            if (typeof imports.products.initProductsUI === 'function') {
              // initialize event listeners (view/add) without re-rendering the grid
              try { imports.products.initProductsUI({ defaultRender: false }); } catch (e) { console.error(e); }
            }
          }
        }
      } catch (e) { console.error('Failed to initialize products UI', e); }
    }

    // Initialize admin pages
    if (page === 'categories.html' && imports.categories && typeof imports.categories.initCategoriesAdmin === 'function') {
      try { imports.categories.initCategoriesAdmin(); } catch (e) { console.error(e); }
    }

    if (page === 'orders.html' && imports.orders && typeof imports.orders.initOrdersAdmin === 'function') {
      try { imports.orders.initOrdersAdmin(); } catch (e) { console.error(e); }
    }

    _activateSidebarNav();

    // If cart page, wire checkout form
    if (page === 'cart.html') {
      if (imports.orders && typeof imports.orders.initCheckoutForm === 'function') {
        try { imports.orders.initCheckoutForm(); } catch (e) { console.error(e); }
      }
      _syncCartUI();
    }

    // Wire auth UI (login, logout, user display)
    if (imports.auth && typeof imports.auth.initAuth === 'function') {
      try { imports.auth.initAuth(); } catch (e) { console.error(e); }
    }

    // Listen to product add events via delegated click on product-card view/add buttons (if product cards are not using custom events)
    document.body.addEventListener('click', (ev) => {
      const add = ev.target.closest('.add-to-cart-trigger, .add-button, .btn-quick-add');
      if (add) {
        const pid = add.getAttribute('data-id') || add.closest('[data-product-id]')?.getAttribute('data-product-id');
        if (pid) addToCart(pid, 1);
      }
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
