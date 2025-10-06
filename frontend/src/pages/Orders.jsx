import React, { useEffect, useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_51RaNzg4TJHeKoXcgSPviBiP7dixSbHCfU4lvSSCCX9LDUc4ebYILr5XOEaL3iJf9h3lMjO6w9Z6gnDW5lPD4wJXN00tI4PoG5y"); // ⚠️ Replace with your Stripe publishable key

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchOrders();
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

      // Redirect to Stripe Checkout
      const { url } = res.data;
      if (url) {
        window.location.href = url;
      } else {
        alert("❌ Unable to start checkout session");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("❌ Payment failed");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div
      className="orders-page"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(218,238,255,1) 25%, rgba(250,220,255,1) 75%)",
        padding: "2rem",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>🛒 My Orders</h1>

      {orders.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555" }}>No orders yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: "2rem",
          }}
        >
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: "15px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                padding: "1.5rem",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <h3 style={{ color: "#444" }}>Order #{order.id}</h3>
              <p>
                💰 Amount: <strong>${order.amount}</strong>
              </p>
              <p>
                Status: <strong>{order.status}</strong>
              </p>
              {order.status !== "paid" ? (
                <button
                  onClick={() => handlePay(order)}
                  style={{
                    marginTop: "1rem",
                    background: "linear-gradient(90deg, #4f46e5, #9333ea)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.6rem 1.2rem",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.target.style.opacity = "1")}
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
