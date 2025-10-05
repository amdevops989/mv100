// utils.js
const API_AUTH = "http://localhost:3000";
const API_CATALOG = "http://localhost:3001";
const API_CART = "http://localhost:3002";
const API_ORDERS = "http://localhost:3003";
const API_PAYMENTS = "http://localhost:3004";

let token = localStorage.getItem("token") || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getToken() {
  return token;
}

export function authHeader() {
  return token ? { Authorization: "Bearer " + token } : {};
}
