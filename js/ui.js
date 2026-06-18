/** UI: навигация, тема, доступность, toast */

import { KEYS, getItem, setItem } from './storage.js';

export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

export function navigate(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('page--active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('page--active');
  window.scrollTo(0, 0);
}

export function initTheme() {
  const saved = getItem(KEYS.THEME, 'light');
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setItem(KEYS.THEME, next);
  });
}

export function initA11y() {
  const saved = getItem(KEYS.A11Y, false);
  document.documentElement.setAttribute('data-a11y', saved);

  document.getElementById('a11yToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-a11y') === 'true';
    document.documentElement.setAttribute('data-a11y', !current);
    setItem(KEYS.A11Y, !current);
    showToast(!current ? 'Режим для слабовидящих включён' : 'Обычный режим');
  });
}

export function updateHeaderAuth(isLoggedIn, userName) {
  const authBtn = document.getElementById('authBtn');
  const profileBtn = document.getElementById('profileBtn');
  if (isLoggedIn) {
    authBtn.hidden = true;
    profileBtn.textContent = userName || 'Кабинет';
    profileBtn.hidden = false;
  } else {
    authBtn.hidden = false;
    authBtn.textContent = 'Войти';
    profileBtn.hidden = false;
  }
}

export function updateBadges(cartCount, favCount) {
  document.getElementById('cartCount').textContent = cartCount;
  document.getElementById('favCount').textContent = favCount;
}

export function initNavigation(handler) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      handler(el.dataset.nav);
    });
  });
}

export function initAuthTabs() {
  document.querySelectorAll('.auth-tabs__btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tabs__btn').forEach((t) => t.classList.remove('auth-tabs__btn--active'));
      tab.classList.add('auth-tabs__btn--active');
      const isLogin = tab.dataset.tab === 'login';
      document.getElementById('loginForm').hidden = !isLogin;
      document.getElementById('registerForm').hidden = isLogin;
    });
  });
}

export function clearFormErrors(formId) {
  document.querySelectorAll(`#${formId} .form-error`).forEach((el) => { el.textContent = ''; });
}

export function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (el) el.textContent = message;
}
