/** Авторизация, регистрация, валидация */

import { KEYS, getItem, setItem, removeItem, generateToken, getUserIdFromToken } from './storage.js';

let usersCache = [];

export async function loadUsers() {
  const res = await fetch('data/users.json');
  const fromFile = await res.json();
  const stored = getItem(KEYS.USERS);

  if (!stored || !stored.length) {
    usersCache = fromFile;
  } else {
    fromFile.forEach((fileUser) => {
      if (!stored.some((u) => u.email.toLowerCase() === fileUser.email.toLowerCase())) {
        stored.push(fileUser);
      }
    });
    usersCache = stored;
  }

  setItem(KEYS.USERS, usersCache);
  return usersCache;
}

export function getUsers() {
  return usersCache;
}

export function getCurrentUser() {
  const token = getItem(KEYS.TOKEN, null);
  if (!token) return null;
  const userId = getUserIdFromToken(token);
  return usersCache.find((u) => u.id === userId) || null;
}

export function isLoggedIn() {
  return !!getCurrentUser();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function login(email, password) {
  const user = usersCache.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return { ok: false, error: 'Неверный email или пароль' };
  const token = generateToken(user.id);
  setItem(KEYS.TOKEN, token);
  return { ok: true, user };
}

export function register({ name, email, password }) {
  if (!name || name.length < 2) return { ok: false, error: 'Имя должно содержать минимум 2 символа', field: 'name' };
  if (!validateEmail(email)) return { ok: false, error: 'Некорректный email', field: 'email' };
  if (!validatePassword(password)) return { ok: false, error: 'Пароль — минимум 6 символов', field: 'password' };
  if (usersCache.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'Email уже зарегистрирован', field: 'email' };
  }
  const newUser = {
    id: Date.now(),
    email,
    password,
    name,
    phone: '',
    address: '',
    bonusPoints: 0,
  };
  usersCache.push(newUser);
  setItem(KEYS.USERS, usersCache);
  const token = generateToken(newUser.id);
  setItem(KEYS.TOKEN, token);
  return { ok: true, user: newUser };
}

export function logout() {
  removeItem(KEYS.TOKEN);
}

export function updateUser(userId, data) {
  const idx = usersCache.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  usersCache[idx] = { ...usersCache[idx], ...data };
  setItem(KEYS.USERS, usersCache);
  return true;
}

export function addBonusPoints(userId, points) {
  const user = usersCache.find((u) => u.id === userId);
  if (!user) return;
  user.bonusPoints = (user.bonusPoints || 0) + points;
  setItem(KEYS.USERS, usersCache);
}

export function addPromoCode(userId, code, discount) {
  const promos = getItem(KEYS.PROMOS, {});
  if (!promos[userId]) promos[userId] = [];
  if (promos[userId].some((p) => p.code === code)) return false;
  promos[userId].push({ code, discount, used: false, date: new Date().toISOString() });
  setItem(KEYS.PROMOS, promos);
  return true;
}

export function getUserPromos(userId) {
  const promos = getItem(KEYS.PROMOS, {});
  return promos[userId] || [];
}

export function markPromoUsed(userId, code) {
  const promos = getItem(KEYS.PROMOS, {});
  const list = promos[userId] || [];
  const promo = list.find((p) => p.code === code);
  if (promo) promo.used = true;
  setItem(KEYS.PROMOS, promos);
}

export function getUserOrders(userId) {
  const orders = getItem(KEYS.ORDERS, []);
  return orders.filter((o) => o.userId === userId);
}

export function createOrder(userId, items, total, promoCode) {
  const orders = getItem(KEYS.ORDERS, []);
  const order = {
    id: Date.now(),
    userId,
    items,
    total,
    promoCode: promoCode || null,
    status: 'Оформлен',
    date: new Date().toLocaleDateString('ru-RU'),
  };
  orders.unshift(order);
  setItem(KEYS.ORDERS, orders);
  return order;
}
