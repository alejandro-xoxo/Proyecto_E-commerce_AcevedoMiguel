/* Orders module (ES Module)
   Exports: createOrder, getOrderById, renderOrders, renderOrderDetails, sortOrdersByDate
   Uses StorageManager to persist orders under storage key managed by StorageManager.
*/

function _getStorage() {
  if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
    throw new Error('StorageManager is required and must be available on window.');
  }
  return new window.StorageManager(window.localStorage);
}

const storage = _getStorage();
if (typeof window !== 'undefined') {
  window.ORDERS_MODULE_LOADED = true;
}

function _generateOrderId() {
  const orders = storage.getOrders();
  const nums = orders
    .map(o => { const m = String(o.id || '').match(/(\d+)$/); return m ? Number(m[1]) : NaN; })
    .filter(n => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : Date.now() % 1000000;
  return `ORD-${String(next).padStart(4, '0')}`;
}

function _formatDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch (err) {
    return iso;
  }
}

function sortOrdersByDate(orders = [], direction = 'desc') {
  const sorted = (orders || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return direction === 'asc' ? sorted : sorted.reverse();
}

function createOrder({ customer, email, phone, address, items = [], total = 0, status = 'pending', meta = {} } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new TypeError('items must be a non-empty array');
  if (!customer || !email || !address) throw new TypeError('customer, email and address are required');

  const orders = storage.getOrders();
  const id = _generateOrderId();
  const date = new Date().toISOString();
  const computedTotal = Number(total) || items.reduce((s, it) => s + (Number(it.subtotal ?? (it.price * (it.qty || 1))) || 0), 0);
  const order = { id, date, customer, email, phone: phone || '', address, items, total: computedTotal, status, meta };

  // Newest first
  orders.unshift(order);
  storage.saveOrders(orders);
  return order;
}

function getOrderById(id) {
  if (!id) return null;
  const orders = storage.getOrders();
  return orders.find(o => o.id === id) || null;
}

function _createOrderRow(order) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-order-id', order.id);
  const dateStr = _formatDate(order.date);
  const totalStr = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total || 0);
  tr.innerHTML = `
    <td>
      <div class="order-date-id">
        <strong>${dateStr}</strong>
        <span class="text-muted">#${order.id}</span>
      </div>
    </td>
    <td>${order.customer}</td>
    <td>${order.email}</td>
    <td>${order.phone || ''}</td>
    <td>
      <div class="order-total-status">
        <strong>${totalStr}</strong>
        <span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pendiente'}</span>
      </div>
    </td>
    <td class="text-right table-actions">
      <button class="icon-btn btn-view-order-detail" data-id="${order.id}" aria-label="Ver detalle">👁</button>
    </td>
  `;
  return tr;
}

function renderOrders({ target = '#orders-tbody', query = '', status = 'all', dateRange = 'all', page = 1, perPage = 50 } = {}) {
  const container = document.querySelector(target);
  if (!container) return { rendered: 0, results: [] };
  let orders = storage.getOrders().slice();

  // newest first
  orders = sortOrdersByDate(orders, 'desc');

  if (query) {
    const q = String(query).toLowerCase();
    orders = orders.filter(o => [o.customer, o.email, o.id].some(f => String(f || '').toLowerCase().includes(q)));
  }

  if (status && status !== 'all') {
    orders = orders.filter(o => (o.status || '').toLowerCase() === String(status).toLowerCase());
  }

  if (dateRange && dateRange !== 'all') {
    const now = Date.now();
    let cutoff = 0;
    if (dateRange === 'today') cutoff = now - 24 * 60 * 60 * 1000;
    if (dateRange === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    if (dateRange === 'month') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    if (cutoff) orders = orders.filter(o => new Date(o.date).getTime() >= cutoff);
  }

  // pagination
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * perPage;
  const pageItems = orders.slice(start, start + perPage);

  container.innerHTML = '';
  pageItems.forEach(o => container.appendChild(_createOrderRow(o)));

  const emptyEl = document.getElementById('empty-orders-message');
  if (emptyEl) emptyEl.classList.toggle('hidden', orders.length > 0);

  // update pagination UI if present
  const currentPageEl = document.getElementById('current-page');
  const totalPagesEl = document.getElementById('total-pages');
  if (currentPageEl) currentPageEl.textContent = String(p);
  if (totalPagesEl) totalPagesEl.textContent = String(totalPages);

  return { rendered: pageItems.length, results: pageItems, total, totalPages, page: p };
}

function renderOrderDetails(id) {
  const order = getOrderById(id);
  if (!order) return null;

  const titleEl = document.getElementById('detail-order-title');
  const dateEl = document.getElementById('detail-order-date');
  const nameEl = document.getElementById('detail-customer-name');
  const emailEl = document.getElementById('detail-customer-email');
  const phoneEl = document.getElementById('detail-customer-phone');
  const idEl = document.getElementById('detail-customer-id');
  const addrEl = document.getElementById('detail-shipping-address');
  const itemsTbody = document.getElementById('detail-order-items');
  const subtotalEl = document.getElementById('detail-subtotal');
  const shippingEl = document.getElementById('detail-shipping');
  const totalEl = document.getElementById('detail-total');
  const statusSelect = document.getElementById('detail-status-select');

  if (titleEl) titleEl.textContent = `PEDIDO #${order.id}`;
  if (dateEl) dateEl.textContent = `${_formatDate(order.date)}`;
  if (nameEl) nameEl.textContent = order.customer;
  if (emailEl) emailEl.textContent = order.email;
  if (phoneEl) phoneEl.textContent = order.phone || '';
  if (idEl) idEl.textContent = order.meta && order.meta.idNumber ? order.meta.idNumber : '';
  if (addrEl) addrEl.innerHTML = String(order.address).replace(/\n/g, '<br>');

  if (itemsTbody) {
    itemsTbody.innerHTML = '';
    order.items.forEach(it => {
      const tr = document.createElement('tr');
      const unit = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(it.price) || 0);
      const subtotal = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(it.subtotal) || (Number(it.price || 0) * Number(it.qty || 1)));
      tr.innerHTML = `
        <td>
          <strong>${it.name}</strong><br>
          <span class="text-muted text-sm">${it.meta || ''}</span>
        </td>
        <td>${it.sku || ''}</td>
        <td>${it.qty || 1}</td>
        <td class="text-right">${unit}</td>
        <td class="text-right">${subtotal}</td>
      `;
      itemsTbody.appendChild(tr);
    });
  }

  if (subtotalEl) subtotalEl.textContent = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total || 0);
  if (shippingEl) shippingEl.textContent = order.meta && order.meta.shipping ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.meta.shipping) : '€0,00';
  if (totalEl) totalEl.textContent = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total || 0);
  if (statusSelect) statusSelect.value = order.status || 'pending';

  const modal = document.getElementById('modal-order-detail');
  if (modal) modal.classList.remove('hidden');

  return order;
}

function _exportOrdersCSV(filename = 'orders.csv') {
  const orders = storage.getOrders();
  if (!orders || !orders.length) return null;
  const rows = [['id', 'date', 'customer', 'email', 'phone', 'address', 'items_count', 'total', 'status']];
  orders.forEach(o => rows.push([o.id, o.date, o.customer, o.email, o.phone, String(o.address).replace(/\n/g, ' '), String((o.items || []).length), String(o.total), o.status || '']));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

// Admin initialization helper: wires orders admin UI (table, filters, modal, export)
function initOrdersAdmin({ tableSelector = '#orders-tbody', searchSelector = '#search-order-input', statusSelector = '#filter-status', dateSelector = '#filter-date' } = {}) {
  if (!document.querySelector(tableSelector)) return;
  renderOrders();

  const searchInput = document.querySelector(searchSelector);
  const statusSelect = document.querySelector(statusSelector);
  const dateSelect = document.querySelector(dateSelector);

  if (searchInput) searchInput.addEventListener('input', (e) => renderOrders({ query: e.target.value, status: statusSelect ? statusSelect.value : 'all', dateRange: dateSelect ? dateSelect.value : 'all' }));
  if (statusSelect) statusSelect.addEventListener('change', (e) => renderOrders({ query: searchInput ? searchInput.value : '', status: e.target.value, dateRange: dateSelect ? dateSelect.value : 'all' }));
  if (dateSelect) dateSelect.addEventListener('change', (e) => renderOrders({ query: searchInput ? searchInput.value : '', status: statusSelect ? statusSelect.value : 'all', dateRange: e.target.value }));

  // Delegate view buttons
  const tbody = document.querySelector(tableSelector);
  if (tbody) {
    tbody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.btn-view-order-detail');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (id) renderOrderDetails(id);
    });
  }

  // Modal controls
  const modal = document.getElementById('modal-order-detail');
  if (modal) {
    const closeBtns = [document.getElementById('btn-close-order-modal'), document.getElementById('btn-close-order-modal-bottom')];
    closeBtns.forEach(b => { if (b) b.addEventListener('click', () => modal.classList.add('hidden')); });
    const updateBtn = document.getElementById('btn-update-status');
    if (updateBtn) updateBtn.addEventListener('click', () => {
      const select = document.getElementById('detail-status-select');
      const title = document.getElementById('detail-order-title');
      const idMatch = title ? (title.textContent || '').match(/#(ORD-\d+)/) : null;
      const id = idMatch ? idMatch[1] : null;
      if (!id) return;
      const newStatus = select ? select.value : 'pending';
      const orders = storage.getOrders();
      const idx = orders.findIndex(o => o.id === id);
      if (idx !== -1) {
        orders[idx].status = newStatus;
        storage.saveOrders(orders);
        renderOrders();
        renderOrderDetails(id);
      }
    });
  }

  // Export button
  const exportBtn = document.getElementById('btn-export-orders');
  if (exportBtn) exportBtn.addEventListener('click', () => _exportOrdersCSV());
}

// Checkout wiring helper for cart page
function initCheckoutForm({ formSelector = '#checkout-form' } = {}) {
  const checkoutForm = document.querySelector(formSelector);
  if (!checkoutForm) return;
  checkoutForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      const name = document.getElementById('checkout-name').value;
      const email = document.getElementById('checkout-email').value;
      const idNumber = document.getElementById('checkout-id-number').value;
      const phone = document.getElementById('checkout-phone').value;
      const address = document.getElementById('checkout-address').value;
      const cart = storage.getCart() || [];
      if (!cart.length) return alert('Tu carrito está vacío.');

      const items = cart.map(ci => ({
        productId: ci.id || ci.productId,
        name: ci.name || ci.title || '',
        sku: ci.sku || '',
        qty: Number(ci.qty || 1),
        price: Number(ci.price || ci.unitPrice || 0),
        subtotal: Number(ci.qty || 1) * Number(ci.price || ci.unitPrice || 0),
        meta: ci.meta || ''
      }));

      const total = items.reduce((s, it) => s + Number(it.subtotal || 0), 0);

      const order = createOrder({ customer: name, email, phone, address, items, total, status: 'pending', meta: { idNumber } });

      // Clear cart and redirect to orders (or show confirmation)
      storage.saveCart([]);
      const inScreens = location.pathname.includes('/screens/');
      const target = inScreens ? 'orders.html' : 'screens/orders.html';
      location.assign(target + `?created=${encodeURIComponent(order.id)}`);
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Error al procesar el pedido. Inténtalo de nuevo.');
    }
  });
}

export { initOrdersAdmin, initCheckoutForm };

export { createOrder, getOrderById, renderOrders, renderOrderDetails, sortOrdersByDate };
