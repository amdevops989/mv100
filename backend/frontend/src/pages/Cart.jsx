import React, { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function Cart() {
  const { items, checkout } = useContext(CartContext);
  const entries = Object.entries(items || {});

  const handleCheckout = async () => {
    try {
      const result = await checkout();
      alert("✅ Order created:\n" + JSON.stringify(result, null, 2));
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(218,238,255,1) 25%, rgba(250,220,255,1) 75%)",
        padding: "2rem",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>🛒 Your Cart</h1>

      {entries.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555", marginTop: "2rem" }}>
          Your cart is empty.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: "2rem",
          }}
        >
          {entries.map(([pid, qty]) => (
            <div
              key={pid}
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
              <h3 style={{ color: "#444", marginBottom: "0.5rem" }}>
                Product #{pid}
              </h3>
              <p style={{ color: "#666" }}>Quantity: <strong>{qty}</strong></p>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleCheckout}
            style={{
              background: "linear-gradient(90deg, #4f46e5, #9333ea)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "0.6rem 1.2rem",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          >
            🛍️ Checkout
          </button>
        </div>
      )}
    </div>
  );
}
