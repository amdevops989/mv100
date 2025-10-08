// src/pages/Cancel.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Cancel() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#7f1d1d",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: "700" }}>❌ Payment Canceled</h1>
      <p style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
        Your payment was not completed. You can try again anytime.
      </p>

      <button
        onClick={() => navigate("/orders")}
        style={{
          marginTop: "2rem",
          background: "linear-gradient(90deg, #4f46e5, #9333ea)",
          color: "white",
          border: "none",
          padding: "0.8rem 1.5rem",
          borderRadius: "12px",
          cursor: "pointer",
          fontSize: "1rem",
        }}
        onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.target.style.opacity = "1")}
      >
        🔙 Back to Orders
      </button>
    </div>
  );
}
