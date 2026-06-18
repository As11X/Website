

import {
  addToCart, toggleFavorite, isFavorite, addRecent,
  toggleCompare, isCompared, getCompare,
} from './cart.js';
import { getProductReviews, addReview, updateReview, deleteReview } from './reviews.js';
import { KEYS, setItem } from './storage.js';

let store = { products: [], categories: [], brands: [], promotions: [] };
let catalogState = {
  filtered: [],
  page: 1,
  view: 'grid',
  searchQuery: '',
};

const PAGE_SIZE = 8;

export async function loadStore() {
  const res = await fetch('data/products.json');
  store = await res.json();
  return store;
}

export function getStore() {
  return store;
}

export function getProduct(id) {
  return store.products.find((p) => p.id === parseInt(id, 10));
}

export function getFilters() {
  return {
    category: document.getElementById('filterCategory')?.value || '',
    brand: document.getElementById('filterBrand')?.value || '',
    priceMin: parseFloat(document.getElementById('filterPriceMin')?.value) || 0,
    priceMax: parseFloat(document.getElementById('filterPriceMax')?.value) || Infinity,
    rating: parseFloat(document.getElementById('filterRating')?.value) || 0,
    inStock: document.getElementById('filterInStock')?.checked || false,
    onSale: document.getElementById('filterOnSale')?.checked || false,
    author: (document.getElementById('filterAuthor')?.value || '').toLowerCase().trim(),
  };
}

export function applyFiltersAndSort(products, searchQuery = '') {
  const f = getFilters();
  const sort = document.getElementById('sortSelect')?.value || 'popular';
  let result = [...products];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
    );
  }

  if (f.category) result = result.filter((p) => p.category === f.category);
  if (f.brand) result = result.filter((p) => p.brand === f.brand);
  if (f.priceMin) result = result.filter((p) => p.price >= f.priceMin);
  if (f.priceMax !== Infinity) result = result.filter((p) => p.price <= f.priceMax);
  if (f.rating) result = result.filter((p) => p.rating >= f.rating);
  if (f.inStock) result = result.filter((p) => p.stock > 0);
  if (f.onSale) result = result.filter((p) => p.oldPrice);
  if (f.author) result = result.filter((p) => p.author.toLowerCase().includes(f.author));

  switch (sort) {
    case 'price-asc': result.sort((a, b) => a.price - b.price); break;
    case 'price-desc': result.sort((a, b) => b.price - a.price); break;
    case 'rating': result.sort((a, b) => b.rating - a.rating); break;
    case 'title': result.sort((a, b) => a.title.localeCompare(b.title, 'ru')); break;
    default: result.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  }

  return result;
}

export function refreshCatalog(searchQuery = catalogState.searchQuery) {
  catalogState.searchQuery = searchQuery;
  catalogState.filtered = applyFiltersAndSort(store.products, searchQuery);
  catalogState.page = 1;
  renderCatalog(false);
}

export function loadMoreCatalog() {
  catalogState.page += 1;
  renderCatalog(true);
}

export function setCatalogView(view) {
  catalogState.view = view;
}

function categoryName(id) {
  return store.categories.find((c) => c.id === id)?.name || id;
}

function brandName(id) {
  return store.brands.find((b) => b.id === id)?.name || id;
}

export function formatPrice(price) {
  return `${price.toLocaleString('ru-RU')} ₽`;
}

export function renderProductCard(product) {
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;
  const fav = isFavorite(product.id);
  const cmp = isCompared(product.id);

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card__img-wrap" data-action="open" data-id="${product.id}">
        ${discount ? `<span class="product-card__badge">-${discount}%</span>` : ''}
        <img class="product-card__img" src="${product.images[0]}" alt="${product.title}" loading="lazy">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title" data-action="open" data-id="${product.id}">${product.title}</h3>
        <p class="product-card__author">${product.author}</p>
        <p class="product-card__price">
          ${formatPrice(product.price)}
          ${product.oldPrice ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>` : ''}
        </p>
        <p class="product-card__rating">★ ${product.rating} · ${product.reviewsCount} отз.</p>
        <div class="product-card__actions">
          <button class="btn btn--primary btn--small" data-action="cart" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Нет в наличии' : 'В корзину'}
          </button>
          <button class="btn btn--secondary btn--small" data-action="fav" data-id="${product.id}" aria-label="Избранное">
            ${fav ? '♥' : '♡'}
          </button>
          <button class="btn btn--secondary btn--small" data-action="compare" data-id="${product.id}" title="Сравнить">
            ${cmp ? '✓' : '⇔'}
          </button>
        </div>
      </div>
    </article>
  `;
}

export function bindProductCards(container, onAction) {
  if (!container) return;
  container.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(el.dataset.id, 10);
      onAction(el.dataset.action, id);
    });
  });
}

export function renderCatalog(append = false) {
  const container = document.getElementById('catalogProducts');
  const countEl = document.getElementById('catalogCount');
  const loadBtn = document.getElementById('loadMoreBtn');
  if (!container) return;

  const { filtered, page, view } = catalogState;
  const end = page * PAGE_SIZE;
  const slice = filtered.slice(0, end);

  container.className = view === 'list' ? 'products-grid products-grid--list' : 'products-grid';

  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">Книги не найдены. Измените фильтры или запрос.</p>';
  } else if (append) {
    const prevCount = container.querySelectorAll('.product-card').length;
    const newItems = slice.slice(prevCount);
    container.insertAdjacentHTML('beforeend', newItems.map((p) => renderProductCard(p)).join(''));
  } else {
    container.innerHTML = slice.map((p) => renderProductCard(p)).join('');
  }

  if (countEl) countEl.textContent = `Найдено: ${filtered.length}`;
  if (loadBtn) loadBtn.hidden = end >= filtered.length;
}

export function initCatalogFilters(onChange) {
  const catSelect = document.getElementById('filterCategory');
  const brandSelect = document.getElementById('filterBrand');

  store.categories.forEach((c) => {
    catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  store.brands.forEach((b) => {
    brandSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
  });

  document.getElementById('filtersForm').addEventListener('input', onChange);
  document.getElementById('filtersForm').addEventListener('change', onChange);
  document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('filtersForm').reset();
    document.getElementById('ratingValue').textContent = '0';
    onChange();
  });

  document.getElementById('filterRating').addEventListener('input', (e) => {
    document.getElementById('ratingValue').textContent = e.target.value;
  });

  document.getElementById('sortSelect').addEventListener('change', onChange);

  document.querySelectorAll('.view-toggle__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle__btn').forEach((b) => b.classList.remove('view-toggle__btn--active'));
      btn.classList.add('view-toggle__btn--active');
      setCatalogView(btn.dataset.view);
      onChange();
    });
  });

  document.getElementById('loadMoreBtn').addEventListener('click', () => loadMoreCatalog());
}

export function renderHome(onAction) {
  const popular = store.products.filter((p) => p.popular).slice(0, 4);
  const popularEl = document.getElementById('popularProducts');
  popularEl.innerHTML = popular.map((p) => renderProductCard(p)).join('');
  bindProductCards(popularEl, onAction);

  document.getElementById('popularCategories').innerHTML = store.categories
    .filter((c) => c.popular)
    .map((c) => `<button class="chip" data-cat="${c.id}">${c.name}</button>`)
    .join('');

  document.getElementById('popularBrands').innerHTML = store.brands
    .filter((b) => b.popular)
    .map((b) => `<button class="chip" data-brand="${b.id}">${b.name}</button>`)
    .join('');

  document.querySelectorAll('#popularCategories .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('filterCategory').value = chip.dataset.cat;
      onAction('catalog-filter');
    });
  });

  document.querySelectorAll('#popularBrands .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('filterBrand').value = chip.dataset.brand;
      onAction('catalog-filter');
    });
  });
}

export function renderRecent(onAction) {
  const recentIds = JSON.parse(localStorage.getItem('knigi_recent') || '[]');
  const section = document.getElementById('recentSection');
  const container = document.getElementById('recentProducts');
  if (!recentIds.length) {
    section.hidden = true;
    return;
  }
  const products = recentIds.map((id) => getProduct(id)).filter(Boolean);
  section.hidden = false;
  container.innerHTML = products.map((p) => renderProductCard(p)).join('');
  bindProductCards(container, onAction);
}

export function renderProductDetail(productId, onAction, currentUser) {
  const product = getProduct(productId);
  if (!product) return;
  addRecent(productId);

  const reviews = getProductReviews(productId);
  const similar = store.products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const container = document.getElementById('productDetail');
  container.innerHTML = `
    <button class="back-link" data-back="catalog">← Назад в каталог</button>
    <div class="product-detail">
      <div class="product-gallery">
        <img class="product-gallery__main" id="galleryMain" src="${product.images[0]}" alt="${product.title}">
        <div class="product-gallery__thumbs">
          ${product.images.map((img, i) => `
            <img class="product-gallery__thumb ${i === 0 ? 'product-gallery__thumb--active' : ''}"
              src="${img}" alt="" data-index="${i}">
          `).join('')}
        </div>
      </div>
      <div>
        <h1>${product.title}</h1>
        <p>${product.author} · ${categoryName(product.category)} · ${brandName(product.brand)}</p>
        <p class="product-detail__price">
          ${formatPrice(product.price)}
          ${product.oldPrice ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>` : ''}
        </p>
        <p class="product-detail__desc">${product.description}</p>
        <p>★ ${product.rating} · В наличии: ${product.stock} шт.</p>
        <div class="product-card__actions" style="margin-bottom:1rem">
          <button class="btn btn--primary" id="detailAddCart" ${product.stock === 0 ? 'disabled' : ''}>В корзину</button>
          <button class="btn btn--secondary" id="detailFav">${isFavorite(product.id) ? '♥ В избранном' : '♡ В избранное'}</button>
          <button class="btn btn--secondary" id="detailCompare">${isCompared(product.id) ? '✓ В сравнении' : '⇔ Сравнить'}</button>
        </div>
      </div>
    </div>

    <div class="reviews-block">
      <h2>Отзывы (${reviews.length})</h2>
      ${currentUser ? renderReviewForm() : '<p>Войдите, чтобы оставить отзыв.</p>'}
      <div id="reviewsList">${reviews.map((r) => renderReviewItem(r, currentUser)).join('')}</div>
    </div>

    ${similar.length ? `
      <div class="similar-products">
        <h2>Похожие книги</h2>
        <div class="products-grid" id="similarProducts"></div>
      </div>
    ` : ''}
  `;

  container.querySelector('[data-back="catalog"]').addEventListener('click', () => onAction('nav', 'catalog'));

  container.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.index, 10);
      document.getElementById('galleryMain').src = product.images[idx];
      container.querySelectorAll('.product-gallery__thumb').forEach((t) => t.classList.remove('product-gallery__thumb--active'));
      thumb.classList.add('product-gallery__thumb--active');
    });
  });

  document.getElementById('detailAddCart').addEventListener('click', () => onAction('cart', product.id));
  document.getElementById('detailFav').addEventListener('click', () => onAction('refresh-product', product.id));
  document.getElementById('detailCompare').addEventListener('click', () => onAction('refresh-product', product.id));

  if (similar.length) {
    const simContainer = document.getElementById('similarProducts');
    simContainer.innerHTML = similar.map((p) => renderProductCard(p)).join('');
    bindProductCards(simContainer, onAction);
  }

  bindReviewEvents(productId, currentUser, onAction);
}

function renderReviewForm() {
  return `
    <form class="review-form" id="reviewForm">
      <label>Оценка</label>
      <div class="star-input" id="starInput">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}
      </div>
      <div class="form-group">
        <label for="reviewText">Текст отзыва</label>
        <textarea id="reviewText" rows="3" required minlength="10"></textarea>
      </div>
      <button type="submit" class="btn btn--primary btn--small">Добавить отзыв</button>
    </form>
  `;
}

function renderReviewItem(review, currentUser) {
  const canEdit = currentUser && review.userId === currentUser.id;
  return `
    <div class="review-item" data-review-id="${review.id}">
      <div class="review-item__header">
        <strong>${review.userName}</strong>
        <span class="review-item__rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
        <span>${review.date}${review.edited ? ' (ред.)' : ''}</span>
      </div>
      <p class="review-text">${review.text}</p>
      ${canEdit ? `
        <button class="btn btn--secondary btn--small" data-edit-review="${review.id}">Изменить</button>
        <button class="btn btn--danger btn--small" data-del-review="${review.id}">Удалить</button>
      ` : ''}
    </div>
  `;
}

function bindReviewEvents(productId, currentUser, onAction) {
  const form = document.getElementById('reviewForm');
  if (form) {
    let selectedRating = 5;
    const stars = form.querySelectorAll('#starInput button');
    stars.forEach((btn) => {
      btn.classList.add('active');
      btn.addEventListener('click', () => {
        selectedRating = parseInt(btn.dataset.star, 10);
        stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('reviewText').value.trim();
      if (text.length < 10) return;
      addReview(productId, {
        userId: currentUser.id,
        userName: currentUser.name,
        rating: selectedRating,
        text,
      });
      onAction('refresh-product', productId);
      onAction('toast', 'Отзыв добавлен');
    });
  }

  document.querySelectorAll('[data-edit-review]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reviewId = parseInt(btn.dataset.editReview, 10);
      const item = btn.closest('.review-item');
      const textEl = item.querySelector('.review-text');
      const newText = prompt('Новый текст отзыва:', textEl.textContent);
      if (!newText || newText.length < 10) return;
      const newRating = parseInt(prompt('Оценка 1-5:', '5'), 10) || 5;
      updateReview(productId, reviewId, { rating: newRating, text: newText });
      onAction('refresh-product', productId);
    });
  });

  document.querySelectorAll('[data-del-review]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Удалить отзыв?')) return;
      deleteReview(productId, parseInt(btn.dataset.delReview, 10));
      onAction('refresh-product', productId);
    });
  });
}

export function renderPromoSlider() {
  const track = document.getElementById('promoTrack');
  const dots = document.getElementById('promoDots');
  if (!track || !store.promotions.length) return;

  track.innerHTML = store.promotions.map((p) => `
    <div class="promo-slide">
      <img src="${p.image}" alt="${p.title}">
      <div class="promo-slide__caption">
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </div>
    </div>
  `).join('');

  dots.innerHTML = store.promotions.map((_, i) =>
    `<button class="promo-slider__dot ${i === 0 ? 'promo-slider__dot--active' : ''}" data-index="${i}" aria-label="Слайд ${i + 1}"></button>`
  ).join('');

  let current = 0;
  const total = store.promotions.length;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.querySelectorAll('.promo-slider__dot').forEach((d, i) => {
      d.classList.toggle('promo-slider__dot--active', i === current);
    });
  }

  document.getElementById('promoPrev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('promoNext').addEventListener('click', () => goTo(current + 1));
  dots.querySelectorAll('.promo-slider__dot').forEach((dot) => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10)));
  });

  setInterval(() => goTo(current + 1), 5000);
}

export function renderCompareBar(onAction) {
  const compare = getCompare();
  let bar = document.getElementById('compareBar');
  if (!compare.length) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'compareBar';
    bar.className = 'compare-bar container';
    document.querySelector('.main').prepend(bar);
  }
  const items = compare.map((id) => getProduct(id)).filter(Boolean);
  bar.innerHTML = `
    <span>Сравнение:</span>
    ${items.map((p) => `<span>${p.title} (${formatPrice(p.price)})</span>`).join(' · ')}
    <button class="btn btn--secondary btn--small" id="clearCompare">Очистить</button>
  `;
  document.getElementById('clearCompare')?.addEventListener('click', () => {
    setItem(KEYS.COMPARE, []);
    onAction('compare-update');
  });
}
