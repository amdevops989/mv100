// import axios from "axios";

// export const BASES = {
//   auth: "http://localhost:3000",
//   catalog: "http://localhost:3001",
//   cart: "http://localhost:3002",
//   orders: "http://localhost:3003",
//   payments: "http://localhost:3004",
// };

// // shared axios client with token interceptor
// const client = axios.create({ timeout: 10000 });

// client.interceptors.request.use(cfg => {
//   try {
//     const token = localStorage.getItem("token");
//     if (token) {
//       cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
//     }
//   } catch (e) {}
//   return cfg;
// });

// export default client;


import axios from "axios";

export const BASES = {
  auth: import.meta.env.VITE_API_AUTH,
  catalog: import.meta.env.VITE_API_CATALOG,
  cart: import.meta.env.VITE_API_CART,
  orders: import.meta.env.VITE_API_ORDERS,
  payments: import.meta.env.VITE_API_PAYMENTS,
};

// Shared axios client with token interceptor
const client = axios.create({ timeout: 10000 });

client.interceptors.request.use(cfg => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      cfg.headers = {
        ...(cfg.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (e) {}
  return cfg;
});

export default client;
