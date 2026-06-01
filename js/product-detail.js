(function () {
  'use strict';

  function _formatPrice(value) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  }

  function _resolveImagePath(src) {
    if (!src) return '';
    const value = String(src).trim();
    if (value.startsWith('http') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
      return value;
    }
    return window.location.pathname.includes('/screens/') ? `../${value}` : value;
  }

  function _getStorage() {
    if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
      return null;
    }
    return new window.StorageManager(window.localStorage);
  }

  function _getProducts() {
    const storage = _getStorage();
    if (!storage) {
      return [];
    }
    return storage.getProducts() || [];
  }

  function _saveCart(cart) {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    try {
      const normalized = Array.isArray(cart) ? cart : [];
      window.localStorage.setItem('cart', JSON.stringify(normalized));
      if (typeof window.StorageManager === 'function') {
        new window.StorageManager(window.localStorage).saveCart(normalized);
      }
      window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
      console.warn('Unable to save cart to localStorage', error);
    }
  }

  function _createCartItem(product) {
    return {
      id: String(product.id || product.codigo || '').trim(),
      productId: String(product.id || product.codigo || '').trim(),
      name: String(product.name || product.nombre || '').trim(),
      price: Number(product.price || product.precio || 0),
      image: String(product.image || product.url_imagen || '').trim(),
      quantity: 1,
      qty: 1
    };
  }

  function initProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('product-detail-container');
    if (!container || !id) {
      window.location.href = 'products.html';
      return;
    }

    const products = _getProducts();
    const product = products.find(p => String(p.id) === String(id));
    if (!product) {
      window.location.href = 'products.html';
      return;
    }

    const imageSrc = _resolveImagePath(product.image || product.url_imagen || '');
    const price = _formatPrice(product.price || product.precio || 0);

    const nameEl = document.getElementById('product-name') || document.getElementById('product-title');
    const categoryEl = document.getElementById('product-category');
    const breadcrumbTitleEl = document.getElementById('product-breadcrumb-title');
    const priceEl = document.getElementById('product-price');
    const descEl = document.getElementById('product-description');
    const imageEl = document.getElementById('product-image');

    const fallback = window.location.pathname.includes('/screens/') ? '../img/hoddie.png' : 'img/hoddie.png';
    if (imageEl) {
      imageEl.innerHTML = `<img id="main-product-image" src="${imageSrc || fallback}" alt="${product.name || product.nombre || 'Producto'}" onerror="this.onerror=null;this.src='${fallback}'">`;
    }

    if (nameEl) nameEl.textContent = product.name || product.nombre || '';
    if (categoryEl) categoryEl.textContent = String(product.category || product.id_categoria || '').replace(/[-_]/g, ' ').toUpperCase();
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = product.name || product.nombre || '';
    if (priceEl) priceEl.textContent = price;
    if (descEl) descEl.innerHTML = product.description || product.descripcion || 'Descripción no disponible.';

    const addBtn = document.getElementById('add-to-cart-btn') || document.getElementById('btn-add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const item = _createCartItem(product);
        if (!item.id) {
          alert('No se pudo agregar el producto al carrito.');
          return;
        }

        let cart = [];
        try {
          cart = JSON.parse(window.localStorage.getItem('cart')) || [];
        } catch (err) {
          cart = [];
        }

        const existing = cart.find(c => c.id === item.id);
        if (existing) {
          existing.quantity = Number(existing.quantity || 1) + 1;
          existing.qty = existing.quantity;
        } else {
          cart.push(item);
        }

        _saveCart(cart);
        alert('Producto añadido al carrito.');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductDetail);
  } else {
    initProductDetail();
  }
})();
