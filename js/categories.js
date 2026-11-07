import { renderProducts } from './products.js';

function _getStorage() {
  if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
    throw new Error('StorageManager is required and must be available on window.');
  }
  return new window.StorageManager(window.localStorage);
}

const storage = _getStorage();

function _slugify(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

function getCategories() {
  return storage.getCategories();
}

function createCategory({ id, name, description } = {}) {
  if (!name) throw new TypeError('name is required');
  const categories = getCategories();
  let newId = id ? String(id) : _slugify(name);
  if (!newId) newId = `cat-${Date.now() % 100000}`;
  // ensure uniqueness
  if (categories.some(c => c.id === newId)) {
    let i = 1;
    while (categories.some(c => c.id === `${newId}-${i}`)) i++;
    newId = `${newId}-${i}`;
  }
  const category = { id: newId, name: String(name), description: description || '' };
  categories.push(category);
  storage.saveCategories(categories);
  return category;
}

function updateCategory(id, updates = {}) {
  if (!id) throw new TypeError('id is required');
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const updated = Object.assign({}, categories[idx], updates);
  categories[idx] = updated;
  storage.saveCategories(categories);
  return updated;
}

function deleteCategory(id) {
  if (!id) throw new TypeError('id is required');
  let categories = getCategories();
  const before = categories.length;
  categories = categories.filter(c => c.id !== id);
  if (categories.length === before) return false;
  storage.saveCategories(categories);

  // Remove category association from products
  const products = storage.getProducts();
  let changed = false;
  const updated = products.map(p => {
    if (p.categoryId === id) {
      changed = true;
      return Object.assign({}, p, { categoryId: '', category: '' });
    }
    return p;
  });
  if (changed) storage.saveProducts(updated);

  return true;
}

function _countProductsForCategory(catId) {
  const products = storage.getProducts();
  return products.filter(p => p.categoryId === catId || p.category === catId || p.category === catId).length;
}

function renderCategoriesTable(targetSelector = '#categories-tbody') {
  const container = document.querySelector(targetSelector);
  if (!container) return { rendered: 0 };
  const categories = getCategories();
  container.innerHTML = '';
  categories.forEach(cat => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-category-id', cat.id);
    tr.innerHTML = `
      <td><strong>${cat.id}</strong></td>
      <td>${cat.name}</td>
      <td class="text-truncate">${cat.description || ''}</td>
      <td>${_countProductsForCategory(cat.id)}</td>
      <td class="text-right table-actions">
        <button class="icon-btn btn-edit-category" data-id="${cat.id}" aria-label="Editar">✎</button>
        <button class="icon-btn btn-delete-category text-danger" data-id="${cat.id}" aria-label="Eliminar">🗑</button>
      </td>
    `;
    container.appendChild(tr);
  });

  const emptyEl = document.getElementById('empty-categories-message');
  if (emptyEl) emptyEl.classList.toggle('hidden', categories.length > 0);
  return { rendered: categories.length };
}

function populateCategoryFilters(targetSelector = '#category-filter .filter-list', includeAll = true) {
  const container = document.querySelector(targetSelector);
  if (!container) return { rendered: 0 };
  const categories = getCategories();
  container.innerHTML = '';

  if (includeAll) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" class="filter-link active" data-id="">Todos <span class="count">(${storage.getProducts().length})</span></a>`;
    container.appendChild(li);
  }

  categories.forEach(cat => {
    const count = _countProductsForCategory(cat.id);
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" class="filter-link" data-id="${cat.id}">${cat.name} <span class="count">(${count})</span></a>`;
    container.appendChild(li);
  });

  // Wire click handlers
  container.querySelectorAll('.filter-link').forEach(link => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      // toggle active class
      container.querySelectorAll('.filter-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const id = link.getAttribute('data-id') || '';
      // call products renderer
      try {
        renderProducts({ mode: 'catalog', filters: id ? { category: id } : {}, query: '' });
      } catch (err) {
        console.error('Failed to render products on category change', err);
      }
    });
  });

  return { rendered: categories.length };
}

// Admin initialization helper: wires category admin UI (table, modals, create/edit/delete)
function initCategoriesAdmin({ tableSelector = '#categories-tbody', filterSelector = '#category-filter .filter-list' } = {}) {
  renderCategoriesTable(tableSelector);
  populateCategoryFilters(filterSelector);

  // Admin table actions (delegation)
  const tbody = document.querySelector(tableSelector);
  if (tbody) {
    tbody.addEventListener('click', (ev) => {
      const edit = ev.target.closest('.btn-edit-category');
      const del = ev.target.closest('.btn-delete-category');
      if (edit) {
        const id = edit.getAttribute('data-id');
        const categories = getCategories();
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        // populate edit modal
        const form = document.getElementById('form-edit-category');
        if (form) {
          document.getElementById('edit-cat-id').value = cat.id;
          document.getElementById('edit-cat-name').value = cat.name;
          document.getElementById('edit-cat-desc').value = cat.description || '';
          document.getElementById('modal-edit-category').classList.remove('hidden');
        }
      }
      if (del) {
        const id = del.getAttribute('data-id');
        if (!confirm('¿Eliminar categoría y desvincular productos?')) return;
        deleteCategory(id);
        renderCategoriesTable(tableSelector);
        populateCategoryFilters(filterSelector);
      }
    });
  }

  // Create modal wiring
  const openBtn = document.getElementById('btn-open-create-modal');
  const createModal = document.getElementById('modal-create-category');
  const closeCreate = document.getElementById('btn-close-create-modal');
  const cancelCreate = document.getElementById('btn-cancel-create');
  const formCreate = document.getElementById('form-create-category');

  if (openBtn && createModal) {
    openBtn.addEventListener('click', () => createModal.classList.remove('hidden'));
  }
  if (closeCreate) closeCreate.addEventListener('click', () => createModal.classList.add('hidden'));
  if (cancelCreate) cancelCreate.addEventListener('click', () => createModal.classList.add('hidden'));

  if (formCreate) {
    formCreate.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = document.getElementById('create-cat-name').value;
      const desc = document.getElementById('create-cat-desc').value;
      try {
        createCategory({ name, description: desc });
        renderCategoriesTable(tableSelector);
        populateCategoryFilters(filterSelector);
        createModal.classList.add('hidden');
        formCreate.reset();
      } catch (err) {
        console.error('Create category failed', err);
        alert('Error al crear la categoría');
      }
    });
  }

  // Edit modal wiring
  const editModal = document.getElementById('modal-edit-category');
  const closeEdit = document.getElementById('btn-close-edit-modal');
  const cancelEdit = document.getElementById('btn-cancel-edit');
  const formEdit = document.getElementById('form-edit-category');

  if (closeEdit) closeEdit.addEventListener('click', () => editModal.classList.add('hidden'));
  if (cancelEdit) cancelEdit.addEventListener('click', () => editModal.classList.add('hidden'));

  if (formEdit) {
    formEdit.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = document.getElementById('edit-cat-id').value;
      const name = document.getElementById('edit-cat-name').value;
      const desc = document.getElementById('edit-cat-desc').value;
      try {
        updateCategory(id, { name, description: desc });
        renderCategoriesTable(tableSelector);
        populateCategoryFilters(filterSelector);
        editModal.classList.add('hidden');
      } catch (err) {
        console.error('Update category failed', err);
        alert('Error al actualizar la categoría');
      }
    });
  }
}

export { createCategory, updateCategory, deleteCategory, renderCategoriesTable as renderCategories, populateCategoryFilters, initCategoriesAdmin };
