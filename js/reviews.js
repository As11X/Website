/** Отзывы — CRUD в localStorage */

import { KEYS, getItem, setItem } from './storage.js';

function allReviews() {
  return getItem(KEYS.REVIEWS, {});
}

export function getProductReviews(productId) {
  const reviews = allReviews();
  return reviews[productId] || [];
}

export function getUserReviews(userId) {
  const reviews = allReviews();
  const result = [];
  Object.entries(reviews).forEach(([productId, list]) => {
    list.forEach((r) => {
      if (r.userId === userId) result.push({ ...r, productId: parseInt(productId, 10) });
    });
  });
  return result;
}

export function addReview(productId, { userId, userName, rating, text }) {
  const reviews = allReviews();
  if (!reviews[productId]) reviews[productId] = [];
  const review = {
    id: Date.now(),
    userId,
    userName,
    rating,
    text,
    date: new Date().toLocaleDateString('ru-RU'),
  };
  reviews[productId].unshift(review);
  setItem(KEYS.REVIEWS, reviews);
  return review;
}

export function updateReview(productId, reviewId, { rating, text }) {
  const reviews = allReviews();
  const list = reviews[productId] || [];
  const idx = list.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], rating, text, edited: true };
  setItem(KEYS.REVIEWS, reviews);
  return list[idx];
}

export function deleteReview(productId, reviewId) {
  const reviews = allReviews();
  if (!reviews[productId]) return;
  reviews[productId] = reviews[productId].filter((r) => r.id !== reviewId);
  setItem(KEYS.REVIEWS, reviews);
}

export function getAverageRating(productId) {
  const list = getProductReviews(productId);
  if (!list.length) return 0;
  return list.reduce((s, r) => s + r.rating, 0) / list.length;
}
