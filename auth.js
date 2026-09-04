/* ============================================================
   Agency OS – Authentication (Local Storage prototype)
   ----------------------------------------------------------
   Temporary frontend-only auth. NOT secure for production.
   Structured so Firebase Auth + Firestore can replace this later.
   ============================================================ */

const AUTH = {
  ACCOUNTS_KEY: 'agency-os:accounts',
  SESSION_KEY: 'agency-os:session',
  USER_DATA_PREFIX: 'agency-os:user:'
};

/* ---------- Password helpers (prototype only) ---------- */

/**
 * Hash a password with SHA-256 (browser Web Crypto).
 * This is NOT a substitute for real auth (no salt/pepper, client-side only).
 * Replace with Firebase Authentication later — never rely on this in production.
 */
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate password strength.
 * Returns { ok: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  if (!/[A-Z]/.test(password || '')) {
    errors.push('Password must include at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password || '')) {
    errors.push('Password must include at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password || '')) {
    errors.push('Password must include at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password || '')) {
    errors.push('Password must include at least one special character.');
  }
  return { ok: errors.length === 0, errors };
}

function validateEmail(email) {
  if (!email || !String(email).trim()) return 'Email is required.';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  return ok ? null : 'Enter a valid email address.';
}

/* ---------- Account storage ---------- */

function loadAccounts() {
  try {
    const raw = localStorage.getItem(AUTH.ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(AUTH.ACCOUNTS_KEY, JSON.stringify(accounts));
}

function findAccountByEmail(email) {
  const accounts = loadAccounts();
  const target = String(email || '').trim().toLowerCase();
  return Object.values(accounts).find(a => a.email === target) || null;
}

function newUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

/* ---------- Public auth API ---------- */

/**
 * Create a new account.
 * @returns {Promise<{ok:boolean, error?:string, user?:object}>}
 */
async function createAccount(email, password, name) {
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr };

  const pw = validatePassword(password);
  if (!pw.ok) return { ok: false, error: pw.errors.join(' ') };

  const normalized = String(email).trim().toLowerCase();
  if (findAccountByEmail(normalized)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  const passwordHash = await hashPassword(password);
  const id = newUserId();
  const account = {
    id,
    email: normalized,
    passwordHash,
    name: (name || '').trim() || normalized.split('@')[0],
    createdAt: new Date().toISOString()
  };

  const accounts = loadAccounts();
  accounts[id] = account;
  saveAccounts(accounts);

  // Isolated empty data store for this user (ready for app data)
  saveUserDataFor(id, 'clients', []);
  saveUserDataFor(id, 'templates', null); // null → app will seed templates on first load

  return {
    ok: true,
    user: { id: account.id, email: account.email, name: account.name }
  };
}

/**
 * Log in with email + password.
 * @returns {Promise<{ok:boolean, error?:string, user?:object}>}
 */
async function loginUser(email, password) {
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr };
  if (!password) return { ok: false, error: 'Password is required.' };

  const account = findAccountByEmail(email);
  if (!account) {
    return { ok: false, error: 'Incorrect email or password.' };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) {
    return { ok: false, error: 'Incorrect email or password.' };
  }

  const session = {
    userId: account.id,
    email: account.email,
    name: account.name,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(AUTH.SESSION_KEY, JSON.stringify(session));

  return {
    ok: true,
    user: { id: account.id, email: account.email, name: account.name }
  };
}

/** Clear session only — does not delete account or user data. */
function logoutUser() {
  localStorage.removeItem(AUTH.SESSION_KEY);
}

/** @returns {{userId, email, name, loggedInAt}|null} */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH.SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.userId) return null;
    // Ensure account still exists
    const accounts = loadAccounts();
    if (!accounts[session.userId]) {
      logoutUser();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  return !!getCurrentUser();
}

/**
 * If not logged in, redirect to login page.
 * Call this on every protected page.
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ---------- User-scoped data (isolated per account) ---------- */

function userDataKey(userId, key) {
  return AUTH.USER_DATA_PREFIX + userId + ':' + key;
}

function saveUserDataFor(userId, key, value) {
  try {
    localStorage.setItem(
      userDataKey(userId, key),
      JSON.stringify(value)
    );
    return true;
  } catch (e) {
    return false;
  }
}

function getUserDataFor(userId, key) {
  try {
    const raw = localStorage.getItem(userDataKey(userId, key));
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/** Read data for the currently logged-in user. */
function getUserData(key) {
  const user = getCurrentUser();
  if (!user) return null;
  return getUserDataFor(user.userId, key);
}

/** Save data for the currently logged-in user. */
function saveUserData(key, value) {
  const user = getCurrentUser();
  if (!user) return false;
  return saveUserDataFor(user.userId, key, value);
}

/* ---------- Auth page UI (only used on index.html) ---------- */

function showAuthMessage(el, text, type) {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'auth-message' + (type ? ' auth-message--' + type : '');
  el.hidden = !text;
}

function switchAuthTab(tab) {
  const loginPanel = document.getElementById('panel-login');
  const signupPanel = document.getElementById('panel-signup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  if (!loginPanel || !signupPanel) return;

  const isLogin = tab === 'login';
  loginPanel.hidden = !isLogin;
  signupPanel.hidden = isLogin;
  if (tabLogin) tabLogin.classList.toggle('active', isLogin);
  if (tabSignup) tabSignup.classList.toggle('active', !isLogin);
  showAuthMessage(document.getElementById('auth-message'), '', '');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (btn) btn.textContent = show ? 'Hide' : 'Show';
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const msg = document.getElementById('auth-message');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit');

  if (btn) btn.disabled = true;
  showAuthMessage(msg, 'Signing in…', 'info');

  try {
    const result = await loginUser(email, password);
    if (!result.ok) {
      showAuthMessage(msg, result.error, 'error');
      if (btn) btn.disabled = false;
      return;
    }
    showAuthMessage(msg, 'Success — redirecting…', 'success');
    window.location.href = 'dashboard.html';
  } catch (e) {
    showAuthMessage(msg, 'Something went wrong. Please try again.', 'error');
    if (btn) btn.disabled = false;
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const msg = document.getElementById('auth-message');
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const btn = document.getElementById('signup-submit');

  if (password !== confirm) {
    showAuthMessage(msg, 'Passwords do not match.', 'error');
    return;
  }

  if (btn) btn.disabled = true;
  showAuthMessage(msg, 'Creating account…', 'info');

  try {
    const result = await createAccount(email, password, name);
    if (!result.ok) {
      showAuthMessage(msg, result.error, 'error');
      if (btn) btn.disabled = false;
      return;
    }
    // Auto-login after signup
    const login = await loginUser(email, password);
    if (!login.ok) {
      showAuthMessage(msg, 'Account created. Please log in.', 'success');
      switchAuthTab('login');
      if (btn) btn.disabled = false;
      return;
    }
    showAuthMessage(msg, 'Account created — redirecting…', 'success');
    window.location.href = 'dashboard.html';
  } catch (e) {
    showAuthMessage(msg, 'Something went wrong. Please try again.', 'error');
    if (btn) btn.disabled = false;
  }
}

/** If already logged in and on the auth page, go to dashboard. */
function redirectIfLoggedIn() {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
  }
}

function initAuthPage() {
  redirectIfLoggedIn();

  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => switchAuthTab('signup'));

  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePasswordVisibility(btn.getAttribute('data-toggle-password'), btn);
    });
  });
}

// Auto-init only on pages that have the auth form
if (document.body && document.body.dataset.page === 'auth') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthPage);
  } else {
    initAuthPage();
  }
}
