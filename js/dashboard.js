(function () {
  'use strict';

  function _getStorage() {
    if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
      return null;
    }
    return new window.StorageManager(window.localStorage);
  }

  function _formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  }

  function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function _renderMetrics(storage) {
    if (!storage) return;
    const orders = storage.getOrders() || [];
    const products = storage.getProducts() || [];
    const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    _setText('total-sales', _formatCurrency(totalSales));
    _setText('total-orders', orders.length);
    _setText('total-products', products.length);
    _setText('total-visits', Math.max(1800, products.length * 180));
  }

  function _renderRecentOrders(storage) {
    if (!storage) return;
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody) return;

    const orders = (storage.getOrders() || []).slice(0, 5);
    tbody.innerHTML = '';

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="6">No hay pedidos recientes.</td></tr>';
      return;
    }

    orders.forEach(order => {
      const tr = document.createElement('tr');
      const date = new Date(order.date || order.createdAt || Date.now());
      const dateString = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(date);
      const total = _formatCurrency(order.total || 0);

      tr.innerHTML = `
        <td>
          <div class="order-date-id">
            <strong>${dateString}</strong>
            <span class="text-muted">#${order.id}</span>
          </div>
        </td>
        <td>${order.customer || order.name || ''}</td>
        <td>${order.email || ''}</td>
        <td>${order.phone || ''}</td>
        <td>
          <div class="order-total-status">
            <strong>${total}</strong>
            <span class="status-badge status-${order.status || 'pending'}">${(order.status || 'Pendiente').toString().charAt(0).toUpperCase() + (order.status || 'pendiente').slice(1)}</span>
          </div>
        </td>
        <td class="text-right table-actions">
          <button class="icon-btn" type="button" disabled aria-label="Ver detalle">👁</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function _initDashboard() {
    const storage = _getStorage();
    _renderMetrics(storage);
    _renderRecentOrders(storage);

    const viewAllOrders = document.getElementById('btn-view-all-orders');
    if (viewAllOrders) {
      viewAllOrders.addEventListener('click', () => {
        const inScreens = window.location.pathname.includes('/screens/');
        window.location.assign(inScreens ? 'orders.html' : 'screens/orders.html');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initDashboard);
  } else {
    _initDashboard();
  }
})();
