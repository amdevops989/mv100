import React, { useEffect, useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const API_ORDERS = import.meta.env.VITE_API_ORDERS;
const API_PRODUCTS = import.meta.env.VITE_API_CATALOG;
const API_PAYMENTS = import.meta.env.VITE_API_PAYMENTS;

function normalizeToOrders(data) {
  if (Array.isArray(data)) return { ok: true, orders: data };
  if (data?.orders) return { ok: true, orders: data.orders };
  if (data?.data) return { ok: true, orders: data.data };
  if (data?.results) return { ok: true, orders: data.results };
  if (data?.id) return { ok: true, orders: [data] };
  if (data?.error || data?.message) return { ok: false, orders: [], reason: data.error || data.message };
  return { ok: false, orders: [], reason: "Unknown response format" };
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatalMsg, setFatalMsg] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setFatalMsg("");

    if (!token) {
      setFatalMsg("No auth token found. Please login.");
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(API_ORDERS, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (typeof res.data !== "object") {
        setFatalMsg("Backend response is not JSON. Check API URL or network.");
        setOrders([]);
        return;
      }

      if (res.status === 401) {
        setFatalMsg("Unauthorized (401). Please login again.");
        setOrders([]);
        return;
      }

      if (res.status >= 400) {
        setFatalMsg(res.data.error || `HTTP ${res.status}`);
        setOrders([]);
        return;
      }

      const normalized = normalizeToOrders(res.data);
      if (!normalized.ok) setFatalMsg(normalized.reason);

      setOrders(normalized.orders || []);
    } catch (err) {
      console.error("Unexpected fetchOrders error:", err);
      setFatalMsg("Unexpected error fetching orders. Check console/network.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (order) => {
    if (!token) return alert("You must be logged in to pay.");

    try {
      const stripe = await stripePromise;
      const res = await axios.post(
        `${API_PAYMENTS}/create-checkout-session`,
        { orderId: order.id, amount: order.amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res?.data?.url) window.location.href = res.data.url;
      else alert("Payment initiation failed — check console.");
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed (see console).");
    }
  };

  if (fatalMsg) {
    return (
      <div style={{ minHeight: "100vh", padding: "2rem", textAlign: "center", color: "#b91c1c" }}>
        <h2>⚠️ {fatalMsg}</h2>
        <p>Open DevTools → Network to inspect the /orders response.</p>
      </div>
    );
  }

  if (loading) return <div style={{ minHeight: "100vh", padding: "2rem", textAlign: "center" }}>Loading orders...</div>;

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", background: "#f5f7fa" }}>
      <h1 style={{ textAlign: "center" }}>🛒 My Orders</h1>
      {orders.length === 0 ? (
        <p style={{ textAlign: "center" }}>No orders yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          {orders.map((order) => (
            <div key={order.id} style={{ display: "flex", gap: "1rem", background: "#fff", borderRadius: 10, padding: "1rem", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", flexWrap: "wrap", alignItems: "center" }}>
              {order.product?.image_url && <img src={order.product.image_url} alt={order.product.name} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10 }} />}
              <div style={{ flexGrow: 1, minWidth: 180 }}>
                <h3 style={{ margin: 0 }}>{order.product?.name || `Order #${order.id}`}</h3>
                <p style={{ margin: "0.2rem 0", color: "#666", fontSize: "0.9rem" }}>{order.product?.description || order.description || ""}</p>
                <p style={{ margin: "0.2rem 0" }}>💰 Amount: ${order.amount}</p>
                <p style={{ margin: "0.2rem 0", fontWeight: "bold", color: order.status === "paid" ? "green" : "orange" }}>Status: {String(order.status || "unknown").toUpperCase()}</p>
              </div>
              {order.status !== "paid" && (
                <button onClick={() => handlePay(order)} style={{ background: "linear-gradient(90deg, #4f46e5, #9333ea)", color: "white", border: "none", borderRadius: 6, padding: "0.5rem 1rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                  💳 Pay
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

