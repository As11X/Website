/**
 * КнигоМир — главный модуль приложения
 * SPA интернет-магазин книг (итоговый проект)
 */

import {
  loadUsers, getCurrentUser, isLoggedIn, login, register, logout,
  updateUser, addPromoCode, getUserPromos, getUserOrders, createOrder,
  markPromoUsed, validateEmail, validatePassword,
} from './auth.js';
import {
  loadStore, refreshCatalog, initCatalogFilters, renderHome, renderRecent,
  renderProductDetail, renderPromoSlider, renderCompareBar,
  bindProductCards, renderProductCard, getProduct, formatPrice, getStore,
} from './catalog.js';
import {
  getCart, getCartCount, addToCart, removeFromCart, updateCartQty,
  clearCart, calcCartTotal, getFavorites, toggleFavorite,
  toggleCompare, getCompare,
} from './cart.js';
import { getUserReviews } from './reviews.js';
import {
  navigate, showToast, initTheme, initA11y, updateHeaderAuth,
  updateBadges, initNavigation, initAuthTabs, clearFormErrors, setFieldError,
} from './ui.js';

let activePromo = null;

/** Центральный обработчик действий */
function handleAction(action, payload) {
  switch (action) {
    case 'open':
      openProduct(payload);
      break;
    case 'cart':
      addToCart(payload);
      showToast('Товар добавлен в корзину');
      refreshUI();
      break;
    case 'fav':
      toggleFavorite(payload);
      refreshUI();
      break;
    case 'compare': {
      const before = getCompare().length;
      toggleCompare(payload);
      const after = getCompare().length;
      if (before >= 3 && after >= 3 && !getCompare().includes(payload)) {
        showToast('Максимум 3 товара для сравнения');
      }
      renderCompareBar(handleAction);
      refreshCatalogPage();
      break;
    }
    case 'nav':
      goToPage(payload);
      break;
    case 'catalog-filter':
      goToPage('catalog');
      refreshCatalog();
      refreshCatalogPage();
      break;
    case 'refresh-product':
      renderProductDetail(payload, handleAction, getCurrentUser());
      refreshUI();
      break;
    case 'toast':
      showToast(payload);
      break;
    case 'compare-update':
      renderCompareBar(handleAction);
      refreshCatalogPage();
      break;
    default:
      break;
  }
}

function openProduct(id) {
  navigate('product');
  renderProductDetail(id, handleAction, getCurrentUser());
  renderRecent(handleAction);
}

function goToPage(page) {
  navigate(page);
  if (page === 'catalog') {
    refreshCatalog();
    refreshCatalogPage();
  } else if (page === 'cart') renderCartPage();
  else if (page === 'favorites') renderFavoritesPage();
  else if (page === 'profile') renderProfilePage('info');
  else if (page === 'home') {
    renderHome(handleAction);
    renderRecent(handleAction);
  }
}

function refreshUI() {
  updateBadges(getCartCount(), getFavorites().length);
  updateHeaderAuth(isLoggedIn(), getCurrentUser()?.name);
}

function refreshCatalogPage() {
  bindProductCards(document.getElementById('catalogProducts'), handleAction);
}

/* ——— Корзина ——— */
function renderCartPage() {
  const container = document.getElementById('cartContent');
  const cart = getCart();
  const products = getStore().products;

  if (!cart.length) {
    container.innerHTML = '<p class="empty-state">Корзина пуста</p>';
    return;
  }

  const rows = cart.map((item) => {
    const p = products.find((pr) => pr.id === item.productId);
    if (!p) return '';
    return `
      <tr>
        <td>${p.title}</td>
        <td>${formatPrice(p.price)}</td>
        <td>
          <div class="cart-qty">
            <button class="btn btn--secondary btn--small" data-qty-minus="${p.id}">−</button>
            <span>${item.qty}</span>
            <button class="btn btn--secondary btn--small" data-qty-plus="${p.id}">+</button>
          </div>
        </td>
        <td>${formatPrice(p.price * item.qty)}</td>
        <td><button class="btn btn--danger btn--small" data-remove="${p.id}">✕</button></td>
      </tr>
    `;
  }).join('');

  const discount = activePromo ? activePromo.discount : 0;
  const { subtotal, discount: discAmt, total } = calcCartTotal(products, discount);

  container.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr><th>Книга</th><th>Цена</th><th>Кол-во</th><th>Сумма</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cart-summary">
      <div class="cart-summary__row"><span>Подитог</span><span>${formatPrice(subtotal)}</span></div>
      ${discAmt ? `<div class="cart-summary__row"><span>Скидка (${discount}%)</span><span>−${formatPrice(discAmt)}</span></div>` : ''}
      <div class="cart-summary__row cart-summary__total"><span>Итого</span><span>${formatPrice(total)}</span></div>
      <div class="promo-input">
        <input type="text" id="promoCodeInput" placeholder="Промокод" value="${activePromo?.code || ''}">
        <button class="btn btn--secondary btn--small" id="applyPromoBtn">Применить</button>
      </div>
      <button class="btn btn--primary" id="checkoutBtn" style="width:100%">Оформить заказ</button>
      ${!isLoggedIn() ? '<p style="font-size:0.85rem;color:var(--text-muted)">Для оформления необходима авторизация</p>' : ''}
    </div>
  `;

  container.querySelectorAll('[data-qty-minus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.qtyMinus, 10);
      const item = cart.find((i) => i.productId === id);
      updateCartQty(id, item.qty - 1);
      renderCartPage();
      refreshUI();
    });
  });

  container.querySelectorAll('[data-qty-plus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.qtyPlus, 10);
      const item = cart.find((i) => i.productId === id);
      updateCartQty(id, item.qty + 1);
      renderCartPage();
      refreshUI();
    });
  });

  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(parseInt(btn.dataset.remove, 10));
      renderCartPage();
      refreshUI();
    });
  });

  document.getElementById('applyPromoBtn').addEventListener('click', () => {
    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const user = getCurrentUser();
    if (!user) {
      showToast('Войдите для использования промокода');
      return;
    }
    const promos = getUserPromos(user.id);
    const promo = promos.find((p) => p.code === code && !p.used);
    if (promo) {
      activePromo = promo;
      showToast(`Промокод ${code} применён (−${promo.discount}%)`);
      renderCartPage();
    } else {
      showToast('Промокод недействителен');
      activePromo = null;
    }
  });

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!isLoggedIn()) {
      showToast('Сначала войдите в аккаунт');
      goToPage('auth');
      return;
    }
    const user = getCurrentUser();
    const items = cart.map((item) => {
      const p = products.find((pr) => pr.id === item.productId);
      return { productId: item.productId, title: p.title, qty: item.qty, price: p.price };
    });
    const { total } = calcCartTotal(products, discount);
    createOrder(user.id, items, total, activePromo?.code);
    if (activePromo) markPromoUsed(user.id, activePromo.code);
    clearCart();
    activePromo = null;
    showToast('Заказ успешно оформлен!');
    refreshUI();
    renderCartPage();
  });
}

/* ——— Избранное ——— */
function renderFavoritesPage() {
  const container = document.getElementById('favoritesList');
  const favs = getFavorites();
  if (!favs.length) {
    container.innerHTML = '<p class="empty-state">В избранном пока ничего нет</p>';
    return;
  }
  const products = favs.map((id) => getProduct(id)).filter(Boolean);
  container.innerHTML = products.map((p) => renderProductCard(p)).join('');
  bindProductCards(container, handleAction);
}

/* ——— Личный кабинет ——— */
function renderProfilePage(section) {
  const user = getCurrentUser();
  const content = document.getElementById('profileContent');
  if (!user) {
    content.innerHTML = '<p class="empty-state">Войдите в аккаунт</p>';
    goToPage('auth');
    return;
  }

  document.querySelectorAll('.profile-nav__btn[data-profile]').forEach((btn) => {
    btn.classList.toggle('profile-nav__btn--active', btn.dataset.profile === section);
  });

  if (section === 'info') {
    content.innerHTML = `
      <div class="profile-card">
        <h2>Мои данные</h2>
        <form id="profileForm">
          <div class="form-group">
            <label for="profileName">Имя</label>
            <input type="text" id="profileName" value="${user.name}" required>
          </div>
          <div class="form-group">
            <label for="profilePhone">Телефон</label>
            <input type="tel" id="profilePhone" value="${user.phone || ''}">
          </div>
          <div class="form-group">
            <label for="profileAddress">Адрес</label>
            <input type="text" id="profileAddress" value="${user.address || ''}">
          </div>
          <div class="form-group">
            <label>Бонусные баллы</label>
            <p>${user.bonusPoints || 0}</p>
          </div>
          <button type="submit" class="btn btn--primary">Сохранить</button>
        </form>
      </div>
    `;
    document.getElementById('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      updateUser(user.id, {
        name: document.getElementById('profileName').value,
        phone: document.getElementById('profilePhone').value,
        address: document.getElementById('profileAddress').value,
      });
      showToast('Данные сохранены');
      refreshUI();
    });
  } else if (section === 'orders') {
    const orders = getUserOrders(user.id);
    content.innerHTML = orders.length
      ? orders.map((o) => `
        <div class="order-item profile-card">
          <strong>Заказ #${o.id}</strong> · ${o.date} · ${o.status}<br>
          ${o.items.map((i) => `${i.title} × ${i.qty}`).join(', ')}<br>
          <strong>${formatPrice(o.total)}</strong>
          ${o.promoCode ? `<br><small>Промокод: ${o.promoCode}</small>` : ''}
        </div>
      `).join('')
      : '<p class="empty-state">Заказов пока нет</p>';
  } else if (section === 'promos') {
    const promos = getUserPromos(user.id);
    content.innerHTML = promos.length
      ? promos.map((p) => `<span class="promo-tag">${p.code} (−${p.discount}%) ${p.used ? '— использован' : ''}</span>`).join('')
      : '<p class="empty-state">Промокодов нет. Пройдите игру в разделе «Бонусы»!</p>';
  } else if (section === 'reviews') {
    const reviews = getUserReviews(user.id);
    content.innerHTML = reviews.length
      ? reviews.map((r) => {
        const p = getProduct(r.productId);
        return `<div class="profile-card review-item">
          <strong>${p?.title || 'Книга'}</strong> · ${'★'.repeat(r.rating)}<br>
          ${r.text}<br><small>${r.date}</small>
        </div>`;
      }).join('')
      : '<p class="empty-state">Вы ещё не оставляли отзывов</p>';
  }

  /* Избранное в кабинете — ссылка */
  if (section === 'info') {
    const favCount = getFavorites().length;
    content.querySelector('.profile-card').insertAdjacentHTML('beforeend',
      `<p style="margin-top:1rem">Избранных товаров: <strong>${favCount}</strong>
       <button class="btn btn--secondary btn--small" id="goFav">Перейти</button></p>`
    );
    document.getElementById('goFav')?.addEventListener('click', () => goToPage('favorites'));
  }
}

/* ——— Игра ——— */
function initGame() {
  const area = document.getElementById('gameArea');
  const scoreEl = document.getElementById('gameScore');
  const timeEl = document.getElementById('gameTime');
  const resultEl = document.getElementById('gameResult');
  let score = 0;
  let timeLeft = 15;
  let timer = null;
  let running = false;

  document.getElementById('startGameBtn').addEventListener('click', () => {
    if (running) return;
    running = true;
    score = 0;
    timeLeft = 15;
    scoreEl.textContent = '0';
    timeEl.textContent = '15';
    resultEl.textContent = '';
    area.innerHTML = '';

    timer = setInterval(() => {
      timeLeft -= 1;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);

    spawnBook();
  });

  function spawnBook() {
    if (!running) return;
    const book = document.createElement('span');
    book.className = 'game-book';
    book.textContent = '📖';
    book.style.left = `${Math.random() * (area.clientWidth - 40)}px`;
    book.style.top = `${Math.random() * (area.clientHeight - 40)}px`;
    book.addEventListener('click', () => {
      score += 1;
      scoreEl.textContent = score;
      book.remove();
      if (score >= 10) {
        endGame(true);
      } else {
        spawnBook();
      }
    });
    area.appendChild(book);
    setTimeout(() => { if (book.parentNode) { book.remove(); spawnBook(); } }, 1200);
  }

  function endGame(won = false) {
    running = false;
    clearInterval(timer);
    area.innerHTML = '';
    if (won || score >= 10) {
      resultEl.textContent = 'Победа! Промокод BOOK10 добавлен в ваш кабинет.';
      const user = getCurrentUser();
      if (user) {
        addPromoCode(user.id, 'BOOK10', 10);
      } else {
        resultEl.textContent += ' Войдите, чтобы сохранить промокод.';
      }
    } else {
      resultEl.textContent = `Игра окончена. Очков: ${score}. Попробуйте ещё раз!`;
    }
  }
}

/* ——— Авторизация ——— */
function initAuthForms() {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    clearFormErrors('loginForm');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmail(email)) {
      setFieldError('loginEmailError', 'Некорректный email');
      return;
    }
    if (!validatePassword(password)) {
      setFieldError('loginPasswordError', 'Минимум 6 символов');
      return;
    }

    const result = login(email, password);
    if (result.ok) {
      showToast(`Добро пожаловать, ${result.user.name}!`);
      refreshUI();
      goToPage('home');
    } else {
      setFieldError('loginPasswordError', result.error);
    }
  });

  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    clearFormErrors('registerForm');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;

    if (password !== confirm) {
      setFieldError('regPasswordConfirmError', 'Пароли не совпадают');
      return;
    }

    const result = register({ name, email, password });
    if (result.ok) {
      showToast('Регистрация успешна!');
      refreshUI();
      goToPage('home');
    } else {
      const errMap = { name: 'regNameError', email: 'regEmailError', password: 'regPasswordError' };
      setFieldError(errMap[result.field] || 'regEmailError', result.error);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    logout();
    refreshUI();
    showToast('Вы вышли из аккаунта');
    goToPage('home');
  });
}

/* ——— Поиск ——— */
function initSearch() {
  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    goToPage('catalog');
    refreshCatalog(query);
    refreshCatalogPage();
  });
}

/* ——— Старт ——— */
async function init() {
  initTheme();
  initA11y();
  initAuthTabs();
  initAuthForms();
  initSearch();
  initGame();

  await loadUsers();
  await loadStore();

  renderPromoSlider();
  renderHome(handleAction);
  renderRecent(handleAction);
  initCatalogFilters(() => {
    refreshCatalog();
    refreshCatalogPage();
  });
  refreshCatalog();
  refreshCatalogPage();
  renderCompareBar(handleAction);

  initNavigation(goToPage);

  document.querySelectorAll('.profile-nav__btn[data-profile]').forEach((btn) => {
    btn.addEventListener('click', () => renderProfilePage(btn.dataset.profile));
  });

  refreshUI();
}

init();
