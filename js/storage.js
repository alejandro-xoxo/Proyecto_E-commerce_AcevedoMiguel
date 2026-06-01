const STORAGE_KEYS = Object.freeze({
  categories: 'aethon_categories',
  products: 'aethon_products',
  orders: 'aethon_orders',
  cart: 'aethon_cart',
  session: 'aethon_session'
});

const DEFAULT_CATEGORIES = [
  { id: 'tops', name: 'Tops', description: 'Hoodies, tees and shirts.' },
  { id: 'bottoms', name: 'Bottoms', description: 'Cargo pants and trousers.' },
  { id: 'accessories', name: 'Accessories', description: 'Hats and small goods.' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'AET-001',
    name: 'Void Hoodie',
    category: 'tops',
    price: 95.0,
    image: 'img/hoddie.png',
    description: 'Clean pullover hoodie with structured hood and cargo-style pocket.',
    stock: 15,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['BLACK', 'VOID PURPLE', 'GREY']
  },
  {
    id: 'AET-002',
    name: 'Phantom Cargo Pants',
    category: 'bottoms',
    price: 119.0,
    image: 'img/cargp.png',
    description: 'Utility cargo pants with adjustable hem and concealed pocketing.',
    stock: 10,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['BLACK', 'VOID PURPLE', 'GREY']
  },
  {
    id: 'AET-003',
    name: 'Shadow Oversize Tee',
    category: 'tops',
    price: 49.0,
    image: 'img/hoddie.png',
    description: 'Soft cotton tee with a dropped shoulder and minimal branding.',
    stock: 20,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['BLACK', 'VOID PURPLE', 'GREY']
  }
];

class StorageManager {
  constructor(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('StorageManager requires window.localStorage.');
    }
    this.storage = storage;
  }

  getCategories() {
    return this._get(STORAGE_KEYS.categories, []);
  }

  saveCategories(categories) {
    this._validateArray(categories, 'categories');
    this._save(STORAGE_KEYS.categories, categories);
  }

  getProducts() {
    return this._get(STORAGE_KEYS.products, []);
  }

  saveProducts(products) {
    this._validateArray(products, 'products');
    const normalized = products.map(product => this._normalizeProduct(product));
    this._save(STORAGE_KEYS.products, normalized);
  }

  saveProduct(product) {
    const normalized = this._normalizeProduct(product);
    const products = this.getProducts();
    const index = products.findIndex(item => item.id === normalized.id);

    if (index === -1) {
      products.push(normalized);
    } else {
      products[index] = normalized;
    }

    this._save(STORAGE_KEYS.products, products);
    return normalized;
  }

  deleteProduct(id) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id is required');
    }

    const products = this.getProducts().filter(item => item.id !== id);
    this._save(STORAGE_KEYS.products, products);
    return true;
  }

  getOrders() {
    return this._get(STORAGE_KEYS.orders, []);
  }

  saveOrders(orders) {
    this._validateArray(orders, 'orders');
    this._save(STORAGE_KEYS.orders, orders);
  }

  getCart() {
    const fallbackCart = this._get('cart', null);
    if (Array.isArray(fallbackCart)) {
      return fallbackCart;
    }
    return this._get(STORAGE_KEYS.cart, []);
  }

  saveCart(cart) {
    this._validateArray(cart, 'cart');
    const normalized = Array.isArray(cart) ? cart : [];
    this._save('cart', normalized);
    this._save(STORAGE_KEYS.cart, normalized);
  }

  getSession() {
    return this._get(STORAGE_KEYS.session, null);
  }

  saveSession(session) {
    this._save(STORAGE_KEYS.session, session ?? {});
  }

  clearSession() {
    this.storage.removeItem(STORAGE_KEYS.session);
  }

  seedData({ force = false } = {}) {
    const categories = this.getCategories();
    const products = this.getProducts();
    const hasCategories = categories.length > 0;
    const hasProducts = products.length > 0;
    const schemaIsValid = this._isProductSchemaValid(products);

    if (!force && hasCategories && hasProducts && schemaIsValid) {
      return { categories, products };
    }

    // Reset storage completely so the new flat product schema is initialized cleanly.
    if (typeof this.storage.clear === 'function') {
      this.storage.clear();
    }

    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveProducts(DEFAULT_PRODUCTS);

    if (force) {
      this.saveOrders([]);
      this.saveCart([]);
      this.saveSession(null);
    }

    return {
      categories: this.getCategories(),
      products: this.getProducts()
    };
  }

  _get(key, fallback) {
    const raw = this.storage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return this._parseJSON(raw, fallback);
  }

  _save(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }

  _normalizeProduct(product) {
    if (!product || typeof product !== 'object') {
      throw new TypeError('product must be an object');
    }

    const normalized = {
      id: String(product.id || product.codigo || '').trim(),
      name: String(product.name || product.nombre || '').trim(),
      category: String(product.category || product.id_categoria || '').trim(),
      price: Number(product.price || product.precio || 0),
      image: String(product.image || product.url_imagen || '').trim(),
      description: String(product.description || product.descripcion || '').trim(),
      stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
      sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : ['S', 'M', 'L', 'XL'],
      colors: Array.isArray(product.colors) ? product.colors.map(String) : ['BLACK', 'VOID PURPLE', 'GREY']
    };

    if (!normalized.id) {
      throw new Error('Product id is required');
    }

    return normalized;
  }

  _parseJSON(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`StorageManager failed to parse key ${value}`);
      return fallback;
    }
  }

  _isProductSchemaValid(products) {
    if (!Array.isArray(products) || products.length === 0) {
      return false;
    }

    return products.every(product => {
      return (
        product &&
        typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        typeof product.category === 'string' &&
        typeof product.price === 'number' &&
        typeof product.description === 'string' &&
        typeof product.stock === 'number' &&
        Array.isArray(product.sizes) &&
        Array.isArray(product.colors)
      );
    });
  }

  _validateArray(value, name) {
    if (!Array.isArray(value)) {
      throw new TypeError(`${name} must be an array.`);
    }
  }
}

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  try {
    const _sm = new StorageManager(window.localStorage);
    _sm.saveCategories(DEFAULT_CATEGORIES);
    _sm.saveProducts(DEFAULT_PRODUCTS);
  } catch (err) {
    // non-fatal: leave existing storage intact if initialization fails
    console.warn('StorageManager: seed to localStorage skipped', err);
  }
}
