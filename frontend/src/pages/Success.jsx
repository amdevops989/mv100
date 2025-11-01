// src/pages/Success.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_ORDERS = import.meta.env.VITE_API_ORDERS;

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("Missing orderId in URL");
      setLoading(false);
      return;
    }

    // Confetti (friendly, short)
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 5,
        spread: 360,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    const markPaid = async () => {
      if (!token) {
        setError("No auth token (please login).");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.put(
          `${API_ORDERS}/${orderId}/paid`,
          { paymentIntent: "manual-confirm" },
          {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            validateStatus: () => true,
          }
        );

        console.debug("[Success] PUT", `${API_ORDERS}/${orderId}/paid`, "status", res.status, "data", res.data);

        if (res.status === 401) {
          setError("Unauthorized (401). Please login again.");
          setLoading(false);
          return;
        }

        if (res.status >= 400) {
          const reason = (res.data && (res.data.error || res.data.message)) || `HTTP ${res.status}`;
          setError(`Failed to mark order as paid: ${reason}`);
          setLoading(false);
          return;
        }

        // res.data expected shape: { order, payment } but we don't assume anything else
        setLoading(false);
        // give user a moment to see success + confetti
        setTimeout(() => navigate("/orders"), 1500);
      } catch (err) {
        console.error("Failed to mark order paid:", err);
        setError("Failed to update order status (see console)");
        setLoading(false);
      }
    };

    markPaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (error)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#fee2e2",
          color: "#991b1b",
          fontFamily: "sans-serif",
          padding: "2rem",
        }}
      >
        <div>
          <h2>⚠️ Payment succeeded but update failed</h2>
          <p>{error}</p>
          <p>Try refreshing or check backend logs / DevTools Network tab.</p>
        </div>
      </div>
    );

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.25rem",
          color: "#065f46",
          fontFamily: "sans-serif",
        }}
      >
        Processing your payment...
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ecfccb 0%, #d9f99d 50%, #a7f3d0 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#065f46",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>✅ Payment Successful!</h1>
      <p style={{ fontSize: "1.1rem", marginTop: "1rem" }}>Your order has been marked as paid 🎁</p>
      <button
        onClick={() => navigate("/orders")}
        style={{
          marginTop: "2rem",
          background: "linear-gradient(90deg, #4f46e5, #9333ea)",
          color: "white",
          border: "none",
          padding: "0.8rem 1.5rem",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        🛍️ Back to My Orders
      </button>
    </div>
  );
}

