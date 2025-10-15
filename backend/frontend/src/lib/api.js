import axios from "axios";

// export const BASES = {
//   auth: "http://localhost:3000",
//   catalog: "http://localhost:3001",
//   cart: "http://localhost:3002",
//   orders: "http://localhost:3003",
//   payments: "http://localhost:3004",
// };
export const BASES = {
  auth: import.meta.env.VITE_AUTH_BASE,
  catalog: import.meta.env.VITE_CATALOG_BASE,
  cart: import.meta.env.VITE_CART_BASE,
  orders: import.meta.env.VITE_ORDERS_BASE,
  payments: import.meta.env.VITE_PAYMENTS_BASE,
};

// shared axios client with token interceptor
const client = axios.create({ timeout: 10000 });

client.interceptors.request.use(cfg => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
    }
  } catch (e) {}
  return cfg;
});

export default client;
