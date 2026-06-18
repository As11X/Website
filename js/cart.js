/** Корзина и избранное */

import { KEYS, getItem, setItem } from './storage.js';

export function getCart() {
  return getItem(KEYS.CART, []);
}

export function saveCart(cart) {
  setItem(KEYS.CART, cart);
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, qty });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId) {
  const cart = getCart().filter((i) => i.productId !== productId);
  saveCart(cart);
  return cart;
}

export function updateCartQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((i) => i.productId !== productId);
  } else {
    const item = cart.find((i) => i.productId === productId);
    if (item) item.qty = qty;
  }
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}

export function calcCartTotal(products, promoDiscount = 0) {
  const cart = getCart();
  let subtotal = 0;
  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (product) subtotal += product.price * item.qty;
  });
  const discount = Math.round(subtotal * promoDiscount / 100);
  return { subtotal, discount, total: subtotal - discount };
}

export function getFavorites() {
  return getItem(KEYS.FAVORITES, []);
}

export function toggleFavorite(productId) {
  let favs = getFavorites();
  if (favs.includes(productId)) {
    favs = favs.filter((id) => id !== productId);
  } else {
    favs.push(productId);
  }
  setItem(KEYS.FAVORITES, favs);
  return favs;
}

export function isFavorite(productId) {
  return getFavorites().includes(productId);
}

export function removeFavorite(productId) {
  const favs = getFavorites().filter((id) => id !== productId);
  setItem(KEYS.FAVORITES, favs);
  return favs;
}

export function addRecent(productId) {
  let recent = getItem(KEYS.RECENT, []);
  recent = recent.filter((id) => id !== productId);
  recent.unshift(productId);
  recent = recent.slice(0, 8);
  setItem(KEYS.RECENT, recent);
  return recent;
}

export function getRecent() {
  return getItem(KEYS.RECENT, []);
}

/* Сравнение товаров (доп. функционал) */
export function getCompare() {
  return getItem(KEYS.COMPARE, []);
}

export function toggleCompare(productId) {
  let list = getCompare();
  if (list.includes(productId)) {
    list = list.filter((id) => id !== productId);
  } else if (list.length < 3) {
    list.push(productId);
  }
  setItem(KEYS.COMPARE, list);
  return list;
}

export function isCompared(productId) {
  return getCompare().includes(productId);
}
