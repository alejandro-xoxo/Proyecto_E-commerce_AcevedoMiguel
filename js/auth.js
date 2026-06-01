/* Auth module (ES Module)
   Provides: login, logout, checkSession, redirectIfLogged, redirectIfNotLogged
*/

const DEFAULT_CREDENTIALS = Object.freeze({
  email: 'admin@mail.com',
  password: '123456',
  name: 'Admin_01',
  role: 'System Architect'
});

function _generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function _getStorage() {
  if (typeof window === 'undefined' || typeof window.StorageManager !== 'function') {
    throw new Error('StorageManager is required and must be available on window.');
  }
  try {
    return new window.StorageManager(window.localStorage);
  } catch (err) {
    console.warn('StorageManager init failed', err);
    throw err;
  }
}

const storage = _getStorage();

function checkSession() {
  return storage.getSession();
}

function _isLogged() {
  return !!checkSession();
}

function _resolvePath(targetInScreens) {
  // If current location is already inside /screens/, resolve relative to current
  const inScreens = location.pathname.includes('/screens/');
  const target = inScreens ? targetInScreens.replace(/^\/screens\//, '') : `screens/${targetInScreens}`;
  return new URL(target, location.href).href;
}

function redirectIfLogged() {
  const session = checkSession();
  if (session) {
    // If we are on a login page, send to dashboard
    const isLoginPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('login.html');
    if (isLoginPage) {
      location.assign(_resolvePath('dashboard.html'));
    }
  }
}

function redirectIfNotLogged() {
  const session = checkSession();
  // Only admin pages are protected
  const protectedFiles = ['dashboard.html', 'orders.html', 'categories.html', 'admin-products.html'];
  const currentFile = location.pathname.split('/').pop();
  if (!session && protectedFiles.includes(currentFile)) {
    location.assign(_resolvePath('login.html'));
  }
}

function _showMessage(id, show = true) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}

function login(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new TypeError('email and password must be strings');
  }

  const cleanedEmail = email.trim().toLowerCase();

  if (cleanedEmail === DEFAULT_CREDENTIALS.email && password === DEFAULT_CREDENTIALS.password) {
    const session = {
      email: cleanedEmail,
      name: DEFAULT_CREDENTIALS.name,
      role: DEFAULT_CREDENTIALS.role,
      token: _generateToken(),
      createdAt: new Date().toISOString()
    };
    storage.saveSession(session);
    location.assign(_resolvePath('dashboard.html'));
    return session;
  }

  alert('Email o contraseña incorrectos');
  return null;
}

function logout() {
  storage.clearSession();
  // Provide a small delay to allow UI updates elsewhere
  setTimeout(() => {
    location.assign(_resolvePath('login.html'));
  }, 150);
}

// Initialization helper to wire auth UI elements
function initAuth({ formSelector = '#auth-form', logoutSelector = '#btn-logout', userNameSelector = '#current-user-name', userRoleSelector = '#current-user-role' } = {}) {
  const form = document.querySelector(formSelector);
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const email = (document.getElementById('email') || {}).value || '';
      const password = (document.getElementById('password') || {}).value || '';
      try {
        login(email, password);
      } catch (err) {
        console.error('Login error', err);
      }
    });
    redirectIfLogged();
  }

  const btnLogout = document.querySelector(logoutSelector);
  if (btnLogout) btnLogout.addEventListener('click', () => logout());

  const session = checkSession();
  if (session) {
    const nameEl = document.querySelector(userNameSelector);
    const roleEl = document.querySelector(userRoleSelector);
    if (nameEl) nameEl.textContent = session.name || session.email;
    if (roleEl) roleEl.textContent = session.role || '';
  }

  // Protect admin pages if not logged
  redirectIfNotLogged();
}

export { initAuth };

export { login, logout, checkSession, redirectIfLogged, redirectIfNotLogged };
