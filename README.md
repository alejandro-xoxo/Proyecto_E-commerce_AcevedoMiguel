# 🛒 Proyecto E-Commerce: Expansión Digital — AETHON

🔗 **Enlace de Producción (GitHub Pages):** [https://alejandro-xoxo.github.io/Proyecto_E-commerce_AcevedoMiguel/](https://alejandro-xoxo.github.io/Proyecto_E-commerce_AcevedoMiguel/)  
📁 **Repositorio:** `Proyecto_E-commerce_AcevedoMiguel`

## 📝 Descripción del Proyecto
Aplicación web de comercio electrónico desarrollada mediante Vanilla JS para expandir las operaciones comerciales de una tienda de indumentaria. El sistema ofrece una experiencia de usuario (UX) fluida, dividida en dos frentes funcionales: un panel de control para la administración interna y una interfaz pública para los compradores.

---

## 📂 Estructura del Proyecto

```text
proyecto_e-commerce_acevedomiguel/
├── 📁 components/        # Web Components (modal-cart.js, navbar.js, product-card.js)
├── 📁 css/               # Estilos modularizados por vista y utilidades base globales
├── 📁 img/               # Recursos visuales e identidad gráfica de la marca
├── 📁 js/                # Lógica funcional Vanilla JS (app.js, auth.js, storage.js, etc.)
├── 📁 screens/           # Vistas secundarias HTML (Módulos Admin y Cliente)
├── 📄 index.html         # Landing page principal y portal de la tienda
└── 📄 README.md          # Documentación técnica del proyecto
```

---

## 🏢 1. FRONT DE ADMINISTRACIÓN
Módulo interno de acceso restringido diseñado para la gestión del inventario y el seguimiento operativo.

* **🔐 Login:** Punto de acceso al sistema. Validado con las credenciales predeterminadas:
  * **Email:** `admin@mail.com`
  * **Contraseña:** `123456`
* **📊 Dashboard:** Panel de control principal con navegación a los módulos de gestión.
* **🏷️ Módulo de Categorías:** Lista, creación mediante ventana modal (requiere nombre y descripción), edición y eliminación de categorías.
* **👕 Módulo de Productos:** Gestión completa (CRUD) del catálogo. Cada registro exige: código, nombre, categoría, precio, imagen (URL) y descripción.
* **📦 Módulo de Pedidos:** Historial de transacciones ordenadas cronológicamente (desde la más reciente a la más antigua), exponiendo datos del cliente, total de la compra y vista de detalles.

---

## 🛒 2. FRONT DE E-COMMERCE
Interfaz pública optimizada para la conversión y exploración del catálogo.

* **🛍️ Vista Principal (Clientes):** Catálogo en tarjetas individuales (miniatura, nombre, precio y botón de agregar al carrito). Incluye buscador por palabras clave y filtro dinámico por categorías.
* **🔍 Vista de Detalle:** Ficha ampliada de la prenda que muestra la imagen en alta resolución, descripción completa, precio y acceso directo de compra.
* **💳 Carrito y Checkout:** Resumen interactivo de los ítems seleccionados y cálculo del valor total. Al presionar "Comprar", un formulario captura los datos de facturación (ID, nombre, dirección, teléfono, e-mail) y almacena automáticamente el pedido con su fecha de realización.

---

## 💻 3. CONSIDERACIONES TÉCNICAS
El software cumple con los siguientes estándares tecnológicos y de desarrollo:

* **⚡ Stack Base:** HTML5, CSS3 y JavaScript (Vanilla) sin librerías externas.
* **🧩 Componentización:** Uso de *Web Components* nativos para encapsular la interfaz.
* **💾 Persistencia de Datos:** Utilización exclusiva de `localStorage` para guardar productos, categorías y pedidos.
* **📱 Diseño UI/UX:** Interfaz 100% *Responsive*, con retroalimentación constante al usuario (alertas de éxito/error).
* **🐙 Control de Versiones:** Gestión del código en GitHub aplicando rigurosamente el estándar `Conventional Commits`.