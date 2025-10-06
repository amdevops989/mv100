import React, { createContext, useEffect, useState, useContext } from "react";
import client, { BASES } from "../lib/api";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cart_local");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  // helper: compute total count
  const count = Object.values(items).reduce((s, v) => s + Number(v || 0), 0);

  // sync local cart to localStorage
  useEffect(() => {
    try { localStorage.setItem("cart_local", JSON.stringify(items)); } catch {}
  }, [items]);

  // If logged in, optionally fetch server cart and merge
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const r = await client.get(`${BASES.cart}/cart`);
        // r.data is object of pid->qty
        const server = r.data || {};
        // merge server into local (server authoritative for this demo)
        setItems(server);
      } catch (e) {
        console.warn("Could not fetch server cart", e.message);
      }
    })();
  }, [isAuthenticated]);

  // Add item: optimistic update + server call
  async function addToCart(productId, qty = 1) {
    // optimistic local update
    setItems(prev => {
      const copy = { ...prev };
      copy[productId] = (Number(copy[productId] || 0) + Number(qty));
      return copy;
    });

    if (!isAuthenticated) {
      // no server sync when not authenticated
      return;
    }

    try {
      await client.post(`${BASES.cart}/cart/add`, { productId, qty });
      // fetch server cart to ensure exact state
      const r = await client.get(`${BASES.cart}/cart`);
      setItems(r.data || {});
    } catch (e) {
      console.error("addToCart failed:", e.message);
      // rollback could be implemented; for now re-fetch
      try {
        const r = await client.get(`${BASES.cart}/cart`);
        setItems(r.data || {});
      } catch {}
    }
  }

  async function checkout() {
    if (!isAuthenticated) throw new Error("Login required");
    const res = await client.post(`${BASES.cart}/cart/checkout`);
    // server empties cart; refresh
    setItems({});
    return res.data;
  }

  return (
    <CartContext.Provider value={{ items, addToCart, checkout, count }}>
      {children}
    </CartContext.Provider>
  );
}
