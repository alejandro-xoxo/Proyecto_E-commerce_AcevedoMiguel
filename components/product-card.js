const PRODUCT_CARD_TEMPLATE = document.createElement('template');
PRODUCT_CARD_TEMPLATE.innerHTML = `
  <style>
    :host { display: block; box-sizing: border-box; width: 100%; max-width: 100%; }
    .card { display: grid; grid-template-rows: auto 1fr; background: transparent; border: 1px solid #1A1A1A; border-radius: 0; overflow: hidden; }
    .card:hover { transform: none; }
    .image-shell { position: relative; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: #000; }
    .product-image { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(100%); transition: filter 0.3s ease; }
    .card:hover .product-image { filter: grayscale(0%); }
    .content { display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem; color: #EEEEEE; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.1em; }
    .category { color: #EEEEEE; font-size: 0.75rem; letter-spacing: 0.12em; }
    .title { margin: 0; font-size: 1rem; line-height: 1.2; color: #FFFFFF; font-family: sans-serif; letter-spacing: 0.12em; }
    .price { margin: 0; font-size: 1.05rem; font-weight: 700; color: #FFFFFF; letter-spacing: 0.12em; }
    .actions { display: grid; gap: 0.5rem; grid-template-columns: 1fr 1fr; }
    .button { border: 1px solid #FFFFFF; border-radius: 0; padding: 0.6rem 0.7rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; background: #FFFFFF; color: #000000; text-transform: uppercase; letter-spacing: 0.1em; font-family: sans-serif; }
    .button.view-button { background: transparent; color: #EEEEEE; border-color: #FFFFFF; }
    .button.view-button:hover { background: #65256b; color: #FFFFFF; border-color: #65256b; }
    .button.add-button { background: #FFFFFF; color: #000000; border-color: #FFFFFF; }
    .button.add-button:hover { background: #65256b; color: #FFFFFF; border-color: #65256b; }
    @media (max-width: 640px) {
      .card { border-radius: 0; }
      .actions { grid-template-columns: 1fr; }
      .content { padding: 0.85rem; }
    }
  </style>
  <article class="card" part="card">
    <div class="image-shell">
      <img class="product-image" src="" alt="" />
    </div>
    <div class="content">
      <span class="category"></span>
      <h2 class="title"></h2>
      <p class="price"></p>
      <div class="actions">
        <button class="button view-button" type="button">View Product</button>
        <button class="button add-button" type="button">Add To Cart</button>
      </div>
    </div>
  </article>
`;

class ProductCard extends HTMLElement {
  static get observedAttributes() {
    return ['product-id', 'name', 'price', 'image', 'category'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(PRODUCT_CARD_TEMPLATE.content.cloneNode(true));
    this.imageEl = this.shadowRoot.querySelector('.product-image');
    this.categoryEl = this.shadowRoot.querySelector('.category');
    this.titleEl = this.shadowRoot.querySelector('.title');
    this.priceEl = this.shadowRoot.querySelector('.price');
    this.handleActionClick = this.handleActionClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.addEventListener('click', this.handleActionClick);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('click', this.handleActionClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case 'image':
        this.updateImage(newValue);
        break;
      case 'name':
        this.updateTitle(newValue);
        break;
      case 'price':
        this.updatePrice(newValue);
        break;
      case 'category':
        this.updateCategory(newValue);
        break;
      case 'product-id':
        // product-id is used by events; no DOM refresh required.
        break;
    }
  }

  get productId() {
    return this.getAttribute('product-id') || null;
  }

  render() {
    this.updateImage(this.getAttribute('image'));
    this.updateTitle(this.getAttribute('name'));
    this.updatePrice(this.getAttribute('price'));
    this.updateCategory(this.getAttribute('category'));
  }

  handleActionClick(event) {
    const viewButton = event.target.closest('.view-button');
    const addButton = event.target.closest('.add-button');

    if (viewButton) {
      this.dispatchEvent(new CustomEvent('view-product', {
        detail: { productId: this.productId },
        bubbles: true,
        composed: true
      }));
      return;
    }

    if (addButton) {
      this.dispatchEvent(new CustomEvent('add-cart', {
        detail: { productId: this.productId },
        bubbles: true,
        composed: true
      }));
    }
  }

  _resolveImagePath(value) {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }
    if (window.location.pathname.includes('/screens/')) {
      return `../${trimmed}`;
    }
    return trimmed;
  }

  updateImage(value) {
    const imageSrc = this._resolveImagePath(value);
    this.imageEl.src = imageSrc || (window.location.pathname.includes('/screens/') ? '../img/hoddie.png' : 'img/hoddie.png');
    this.imageEl.alt = this.getAttribute('name') ? this.getAttribute('name').trim() : 'Product image';
    this.imageEl.onerror = () => {
      this.imageEl.onerror = null;
      this.imageEl.src = window.location.pathname.includes('/screens/') ? '../img/hoddie.png' : 'img/hoddie.png';
    };
  }

  updateTitle(value) {
    this.titleEl.textContent = value ? value.trim() : 'Untitled product';
  }

  updateCategory(value) {
    this.categoryEl.textContent = value ? value.trim() : '';
    this.categoryEl.style.display = value ? 'inline-block' : 'none';
  }

  updatePrice(value) {
    this.priceEl.textContent = value ? value.trim() : '$0.00';
  }
}

customElements.define('product-card', ProductCard);
