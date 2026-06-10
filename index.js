
// Инициализация данных
let products = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let reviews = JSON.parse(localStorage.getItem('reviews')) || {};
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let promoCodes = JSON.parse(localStorage.getItem('promoCodes')) || [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
let currentPage = 1;
const itemsPerPage = 12;
let currentProductId = null;
let isRegisterMode = false;

// Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('https://dummyjson.com/products?limit=100');
        const data = await response.json();
        products = data.products.map(p => ({
            ...p,
            originalPrice: p.price,
            discount: p.discountPercentage || 0,
            price: Math.round(p.price * (1 - (p.discountPercentage || 0) / 100))
        }));
        filteredProducts = [...products];

        // Заполнение фильтров
        const categories = [...new Set(products.map(p => p.category))];
        const brands = [...new Set(products.map(p => p.brand).filter(b => b))];

        document.getElementById('categoryFilter').innerHTML = '<option value="">Все категории</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('brandFilter').innerHTML = '<option value="">Любой бренд</option>' +
            brands.map(b => `<option value="${b}">${b}</option>`).join('');

        renderProducts();
        updateCounts();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// Фильтрация и сортировка
function filterProducts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const priceRange = document.getElementById('priceFilter').value;
    const rating = document.getElementById('ratingFilter').value;
    const brand = document.getElementById('brandFilter').value;
    const stock = document.getElementById('stockFilter').value;
    const discount = document.getElementById('discountFilter').value;
    const sort = document.getElementById('sortFilter').value;

    filteredProducts = products.filter(p => {
        if (search && !p.title.toLowerCase().includes(search) && !p.description.toLowerCase().includes(search)) return false;
        if (category && p.category !== category) return false;
        if (rating && p.rating < parseFloat(rating)) return false;
        if (brand && p.brand !== brand) return false;

        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            if (p.price < min || p.price > max) return false;
        }

        if (stock === 'instock' && p.stock === 0) return false;
        if (stock === 'lowstock' && p.stock > 5) return false;

        if (discount === 'yes' && (!p.discount || p.discount === 0)) return false;
        if (discount === 'no' && p.discount > 0) return false;

        return true;
    });

    // Сортировка
    switch (sort) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'rating-desc':
            filteredProducts.sort((a, b) => b.rating - a.rating);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    currentPage = 1;
    renderProducts();
}

// Отображение товаров
function renderProducts() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageProducts = filteredProducts.slice(start, end);

    document.getElementById('productsGrid').innerHTML = pageProducts.map(p => `
                <div class="product-card">
                    <img src="${p.thumbnail}" alt="${p.title}" onclick="showProductDetail(${p.id})">
                    <h3 onclick="showProductDetail(${p.id})" style="cursor:pointer">${p.title}</h3>
                    <div class="price">${p.price}₽ ${p.discount > 0 ? `<s style="color:#999;font-size:12px">${p.originalPrice}₽</s>` : ''}</div>
                    <div class="stars">${'⭐'.repeat(Math.round(p.rating))} (${p.rating})</div>
                    <button class="btn" onclick="addToCart(${p.id})">🛒 В корзину</button>
                    <button class="btn" onclick="toggleWishlist(${p.id})">
                        ${wishlist.includes(p.id) ? '❤️' : '🤍'}
                    </button>
                </div>
            `).join('');

    renderPagination();
}

// Пагинация
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    let paginationHTML = '';

    if (totalPages > 1) {
        paginationHTML += `<button class="btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML += `<button class="btn" onclick="changePage(${i})" style="${i === currentPage ? 'background:#333;color:white' : ''}">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML += '<span>...</span>';
            }
        }

        paginationHTML += `<button class="btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>`;
    }

    document.getElementById('pagination').innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProducts();
        window.scrollTo(0, 0);
    }
}

// Детали товара
function showProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;

    // Добавление в недавно просмотренные
    recentlyViewed = recentlyViewed.filter(pid => pid !== id);
    recentlyViewed.unshift(id);
    recentlyViewed = recentlyViewed.slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));

    const productReviews = reviews[id] || [];

    document.getElementById('productDetailContent').innerHTML = `
                <h2>${product.title}</h2>
                <div style="display:flex;gap:20px;flex-wrap:wrap;margin:20px 0">
                    <div style="flex:1;min-width:300px">
                        <div style="display:flex;gap:10px;flex-wrap:wrap">
                            ${product.images.map(img => `<img src="${img}" style="width:100px;height:100px;object-fit:contain;border:1px solid #ddd;cursor:pointer" onclick="this.parentElement.parentElement.querySelector('img').src='${img}'">`).join('')}
                        </div>
                        <img src="${product.images[0]}" style="width:100%;max-width:400px;margin-top:10px" id="mainImage">
                    </div>
                    <div style="flex:1;min-width:300px">
                        <div class="price" style="font-size:24px">${product.price}₽</div>
                        ${product.discount > 0 ? `<s style="color:#999">${product.originalPrice}₽</s> <span style="color:green">-${product.discount}%</span>` : ''}
                        <div class="stars" style="font-size:20px">${'⭐'.repeat(Math.round(product.rating))} (${product.rating})</div>
                        <p><strong>Бренд:</strong> ${product.brand || 'Не указан'}</p>
                        <p><strong>Категория:</strong> ${product.category}</p>
                        <p><strong>В наличии:</strong> ${product.stock} шт.</p>
                        <p><strong>Описание:</strong> ${product.description}</p>
                        <button class="btn" onclick="addToCart(${product.id})">🛒 Добавить в корзину</button>
                        <button class="btn" onclick="toggleWishlist(${product.id})">
                            ${wishlist.includes(product.id) ? '❤️ В избранном' : '🤍 В избранное'}
                        </button>
                        <button class="btn" onclick="showReviewModal(${product.id})">💬 Отзывы (${productReviews.length})</button>
                    </div>
                </div>
                
                <h3>Похожие товары</h3>
                <div class="products-grid">
                    ${products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(p => `
                        <div class="product-card">
                            <img src="${p.thumbnail}" alt="${p.title}" onclick="showProductDetail(${p.id})">
                            <h3 onclick="showProductDetail(${p.id})" style="cursor:pointer">${p.title}</h3>
                            <div class="price">${p.price}₽</div>
                            <button class="btn" onclick="addToCart(${p.id})">🛒 В корзину</button>
                        </div>
                    `).join('')}
                </div>
                
                ${recentlyViewed.length > 1 ? `
                    <h3>Вы недавно смотрели</h3>
                    <div class="products-grid">
                        ${recentlyViewed.filter(pid => pid !== id).slice(0, 4).map(pid => {
        const p = products.find(prod => prod.id === pid);
        return p ? `
                                <div class="product-card">
                                    <img src="${p.thumbnail}" alt="${p.title}" onclick="showProductDetail(${p.id})">
                                    <h3 onclick="showProductDetail(${p.id})" style="cursor:pointer">${p.title}</h3>
                                    <div class="price">${p.price}₽</div>
                                </div>
                            ` : '';
    }).join('')}
                    </div>
                ` : ''}
            `;

    showPage('productDetail');
}

// Корзина
function addToCart(id) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounts();
    alert('Товар добавлен в корзину!');
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounts();
    renderCart();
}

function updateCartQuantity(id, quantity) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity = Math.max(1, quantity);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        updateCounts();
    }
}

function renderCart() {
    if (!currentUser) {
        document.getElementById('cartItems').innerHTML = '<p>Войдите для просмотра корзины</p>';
        document.getElementById('cartTotal').innerHTML = '';
        return;
    }

    const cartHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        return `
                    <div class="cart-item">
                        <div>
                            <img src="${product.thumbnail}" style="width:50px;height:50px;object-fit:contain">
                            <strong>${product.title}</strong>
                            <div>${product.price}₽ x 
                                <input type="number" value="${item.quantity}" min="1" style="width:50px" 
                                    onchange="updateCartQuantity(${item.id}, this.value)">
                            </div>
                        </div>
                        <div>
                            <strong>${product.price * item.quantity}₽</strong>
                            <button class="btn" onclick="removeFromCart(${item.id})">🗑</button>
                        </div>
                    </div>
                `;
    }).join('');

    const total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    document.getElementById('cartItems').innerHTML = cartHTML || '<p>Корзина пуста</p>';
    document.getElementById('cartTotal').innerHTML = cart.length > 0 ? `<h3>Итого: ${total}₽</h3>` : '';
}

function checkout() {
    if (!currentUser) {
        alert('Войдите для оформления заказа');
        showAuthModal();
        return;
    }
    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }

    const total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const order = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru'),
        items: [...cart],
        total,
        status: 'Оформлен'
    };

    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounts();
    alert('Заказ успешно оформлен!');
    renderCart();
}

// Избранное
function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(wid => wid !== id);
    } else {
        wishlist.push(id);
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateCounts();
    renderProducts();
    if (document.getElementById('wishlist').classList.contains('active')) {
        renderWishlist();
    }
}

function renderWishlist() {
    const wishlistHTML = wishlist.map(id => {
        const product = products.find(p => p.id === id);
        if (!product) return '';
        return `
                    <div class="wishlist-item">
                        <div>
                            <img src="${product.thumbnail}" style="width:50px;height:50px;object-fit:contain">
                            <strong>${product.title}</strong>
                            <div class="price">${product.price}₽</div>
                        </div>
                        <div>
                            <button class="btn" onclick="addToCart(${product.id})">🛒 В корзину</button>
                            <button class="btn" onclick="toggleWishlist(${product.id})">🗑</button>
                        </div>
                    </div>
                `;
    }).join('');

    document.getElementById('wishlistItems').innerHTML = wishlistHTML || '<p>Список избранного пуст</p>';
}

// Авторизация
function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('authTitle').textContent = isRegisterMode ? 'Регистрация' : 'Вход';
    document.getElementById('authSubmit').textContent = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
    document.getElementById('authName').style.display = isRegisterMode ? 'block' : 'none';
}

function authenticate() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;

    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }

    if (isRegisterMode) {
        if (!name) {
            alert('Введите имя');
            return;
        }
        if (users.find(u => u.email === email)) {
            alert('Пользователь с таким email уже существует');
            return;
        }
        const newUser = { email, password, name, bonuses: 0 };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = newUser;
        alert('Регистрация успешна!');
    } else {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            alert('Неверный email или пароль');
            return;
        }
        currentUser = user;
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAuthButton();
    closeAuthModal();
    renderProfile();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthButton();
    showPage('catalog');
}

function updateAuthButton() {
    const authBtn = document.getElementById('authBtn');
    if (currentUser) {
        authBtn.textContent = `Выйти (${currentUser.name})`;
        authBtn.onclick = logout;
    } else {
        authBtn.textContent = 'Войти';
        authBtn.onclick = showAuthModal;
    }
}

// Профиль
function renderProfile() {
    if (!currentUser) {
        document.getElementById('profileContent').innerHTML = '<p>Войдите для просмотра профиля</p>';
        return;
    }

    const userOrders = orders.filter(o => {
        return true; // Все заказы (в реальном приложении фильтровать по пользователю)
    });

    document.getElementById('profileContent').innerHTML = `
                <h3>Информация о пользователе</h3>
                <p><strong>Имя:</strong> ${currentUser.name}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Бонусы:</strong> ${currentUser.bonuses || 0} баллов</p>
                <button class="btn" onclick="editProfile()">✏️ Редактировать</button>
                
                <h3 style="margin-top:20px">Мои заказы</h3>
                ${userOrders.length > 0 ? userOrders.map(order => `
                    <div style="border:1px solid #ddd;padding:10px;margin:10px 0">
                        <p><strong>Заказ #${order.id}</strong></p>
                        <p>Дата: ${order.date}</p>
                        <p>Сумма: ${order.total}₽</p>
                        <p>Статус: ${order.status}</p>
                        <p>Товаров: ${order.items.length}</p>
                    </div>
                `).join('') : '<p>Заказов пока нет</p>'}
                
                <h3 style="margin-top:20px">Промокоды</h3>
                ${promoCodes.length > 0 ? promoCodes.map(code => `
                    <div style="border:1px solid #ddd;padding:10px;margin:10px 0">
                        <strong>${code.code}</strong> - Скидка ${code.discount}%
                    </div>
                `).join('') : '<p>Промокодов пока нет</p>'}
            `;
}

function editProfile() {
    const newName = prompt('Введите новое имя:', currentUser.name);
    if (newName && newName.trim()) {
        currentUser.name = newName.trim();
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));
        }
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        renderProfile();
        updateAuthButton();
    }
}

// Отзывы
function showReviewModal(productId) {
    currentProductId = productId;
    const productReviews = reviews[productId] || [];

    document.getElementById('reviewsList').innerHTML = productReviews.length > 0 ?
        productReviews.map((review, index) => `
                    <div class="review">
                        <div class="stars">${'⭐'.repeat(review.rating)}</div>
                        <p>${review.text}</p>
                        <small>${review.author} - ${review.date}</small>
                        ${currentUser && review.author === currentUser.email ?
                `<button class="btn" onclick="deleteReview(${productId}, ${index})">🗑 Удалить</button>` : ''}
                    </div>
                `).join('') : '<p>Отзывов пока нет</p>';

    document.getElementById('reviewModal').style.display = 'block';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

function submitReview() {
    if (!currentUser) {
        alert('Войдите для оставления отзыва');
        return;
    }

    const rating = document.getElementById('reviewRating').value;
    const text = document.getElementById('reviewText').value;

    if (!text.trim()) {
        alert('Введите текст отзыва');
        return;
    }

    if (!reviews[currentProductId]) {
        reviews[currentProductId] = [];
    }

    reviews[currentProductId].push({
        rating: parseInt(rating),
        text,
        author: currentUser.email,
        date: new Date().toLocaleDateString('ru')
    });

    localStorage.setItem('reviews', JSON.stringify(reviews));
    document.getElementById('reviewText').value = '';
    showReviewModal(currentProductId);
}

function deleteReview(productId, index) {
    reviews[productId].splice(index, 1);
    localStorage.setItem('reviews', JSON.stringify(reviews));
    showReviewModal(productId);
}

// Игра
function playGame() {
    if (!currentUser) {
        alert('Войдите для игры');
        return;
    }

    const guess = parseInt(document.getElementById('guessNumber').value);
    const secretNumber = Math.floor(Math.random() * 10) + 1;

    if (guess === secretNumber) {
        const discount = Math.floor(Math.random() * 20) + 5;
        const code = 'WIN' + Date.now().toString(36).toUpperCase();

        promoCodes.push({
            code,
            discount,
            date: new Date().toLocaleDateString('ru')
        });

        currentUser.bonuses = (currentUser.bonuses || 0) + 100;
        localStorage.setItem('promoCodes', JSON.stringify(promoCodes));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        document.getElementById('gameResult').innerHTML = `
                    <p style="color:green;font-weight:bold">🎉 Поздравляем! Вы угадали число ${secretNumber}!</p>
                    <p>Ваш промокод: <strong>${code}</strong></p>
                    <p>Скидка: ${discount}%</p>
                    <p>+100 бонусов!</p>
                `;
        renderProfile();
    } else {
        document.getElementById('gameResult').innerHTML = `
                    <p style="color:red">😔 Не угадали. Загаданное число было ${secretNumber}</p>
                `;
    }
}

// Темы
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
}

function toggleAccessibility() {
    document.body.classList.toggle('accessibility');
    localStorage.setItem('accessibility', document.body.classList.contains('accessibility'));
}

// Навигация
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'cart') renderCart();
    if (pageId === 'wishlist') renderWishlist();
    if (pageId === 'profile') renderProfile();
}

// Счетчики
function updateCounts() {
    document.getElementById('cartCount').innerHTML = cart.length > 0 ? `<span class="badge">${cart.length}</span>` : '';
    document.getElementById('wishlistCount').innerHTML = wishlist.length > 0 ? `<span class="badge">${wishlist.length}</span>` : '';
}

// Слайдер
let currentSlide = 0;
function rotateSlider() {
    const slides = document.querySelectorAll('.slide');
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}
setInterval(rotateSlider, 3000);

// Инициализация
window.onload = function () {
    loadProducts();
    updateAuthButton();

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }
    if (localStorage.getItem('accessibility') === 'true') {
        document.body.classList.add('accessibility');
    }
};