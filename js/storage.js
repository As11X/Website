

export const KEYS = {
  TOKEN: 'knigi_token',
  USERS: 'knigi_users',
  CART: 'knigi_cart',
  FAVORITES: 'knigi_favorites',
  ORDERS: 'knigi_orders',
  REVIEWS: 'knigi_reviews',
  PROMOS: 'knigi_promos',
  RECENT: 'knigi_recent',
  COMPARE: 'knigi_compare',
  THEME: 'knigi_theme',
  A11Y: 'knigi_a11y',
};

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key) {
  localStorage.removeItem(key);
}

export function generateToken(userId) {
  return btoa(`${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`);
}

export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const decoded = atob(token);
    return parseInt(decoded.split(':')[0], 10);
  } catch {
    return null;
  }
}
