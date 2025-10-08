import React, { useEffect, useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";

// Load from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchOrders();
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setTimeout(() => fetchOrders(), 2000);
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:3003/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (order) => {
    try {
      const stripe = await stripePromise;
      const res = await axios.post(
        "http://localhost:3004/payments/create-checkout-session",
        { orderId: order.id, amount: order.amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Payment error:", err);
      alert("❌ Payment failed");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ padding: "2rem", background: "#f5f7fa", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>🛒 My Orders</h1>
      {orders.length === 0 ? (
        <p style={{ textAlign: "center" }}>No orders yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "1rem",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <h3>Order #{order.id}</h3>
              <p>💰 Amount: ${order.amount}</p>
              <p>Status: {order.status}</p>
              {order.status !== "paid" ? (
                <button
                  onClick={() => handlePay(order)}
                  style={{
                    background: "linear-gradient(90deg, #4f46e5, #9333ea)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                  }}
                >
                  💳 Pay with Stripe
                </button>
              ) : (
                <p style={{ color: "green", fontWeight: "bold" }}>✅ Paid</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
