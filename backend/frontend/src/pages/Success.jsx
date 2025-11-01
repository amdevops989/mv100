// // src/pages/Success.jsx
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import confetti from "canvas-confetti";
// import { useSearchParams, useNavigate } from "react-router-dom";

// export default function Success() {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const orderId = searchParams.get("orderId");
//   const token = localStorage.getItem("token");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     console.log("🎉 Success page loaded with orderId:", orderId);
//     if (!orderId) {
//       setError("Missing orderId");
//       return;
//     }

//     // Confetti celebration
//     const duration = 2000;
//     const end = Date.now() + duration;
//     (function frame() {
//       confetti({
//         particleCount: 5,
//         spread: 360,
//         origin: { x: Math.random(), y: Math.random() - 0.2 },
//       });
//       if (Date.now() < end) requestAnimationFrame(frame);
//     })();

//     // Call backend to update order
//     axios
//       .put(
//         `http://localhost:3003/orders/${orderId}/paid`,
//         { paymentIntent: "manual-confirm" },
//         { headers: { "Content-Type": "application/json" } }
//       )
//       .then((res) => {
//         console.log("✅ Order updated to paid:", res.data);
//         setLoading(false);
//         setTimeout(() => navigate("/orders"), 2000);
//       })
//       .catch((err) => {
//         console.error("❌ Failed to update order:", err);
//         setError("Failed to update order status");
//         setLoading(false);
//       });
//   }, [orderId]);

//   if (error)
//     return (
//       <div
//         style={{
//           minHeight: "100vh",
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           background: "#fee2e2",
//           color: "#991b1b",
//           fontFamily: "sans-serif",
//         }}
//       >
//         <div>
//           <h2>⚠️ Payment success, but update failed</h2>
//           <p>{error}</p>
//           <p>Try refreshing or check backend logs.</p>
//         </div>
//       </div>
//     );

//   if (loading)
//     return (
//       <div
//         style={{
//           minHeight: "100vh",
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           fontSize: "1.5rem",
//           color: "#065f46",
//           fontFamily: "sans-serif",
//         }}
//       >
//         Processing your payment...
//       </div>
//     );

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background:
//           "linear-gradient(135deg, #ecfccb 0%, #d9f99d 50%, #a7f3d0 100%)",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         textAlign: "center",
//         color: "#065f46",
//         fontFamily: "'Inter', sans-serif",
//         padding: "2rem",
//       }}
//     >
//       <h1 style={{ fontSize: "2.5rem", fontWeight: "700" }}>
//         ✅ Payment Successful!
//       </h1>
//       <p style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
//         Your order has been marked as paid 🎁
//       </p>
//       <button
//         onClick={() => navigate("/orders")}
//         style={{
//           marginTop: "2rem",
//           background: "linear-gradient(90deg, #4f46e5, #9333ea)",
//           color: "white",
//           border: "none",
//           padding: "0.8rem 1.5rem",
//           borderRadius: "12px",
//           cursor: "pointer",
//           fontSize: "1rem",
//         }}
//       >
//         🛍️ Back to My Orders
//       </button>
//     </div>
//   );
// }

// src/pages/Success.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useSearchParams, useNavigate } from "react-router-dom";

// ✅ Backend endpoint from env variable
const API_ORDERS = import.meta.env.VITE_API_ORDERS;

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("🎉 Success page loaded with orderId:", orderId);
    if (!orderId) {
      setError("Missing orderId");
      setLoading(false);
      return;
    }

    // Confetti celebration
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

    // Call backend to update order status
    axios
      .put(
        `${API_ORDERS}/${orderId}/paid`,
        { paymentIntent: "manual-confirm" },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((res) => {
        console.log("✅ Order updated to paid:", res.data);
        setLoading(false);
        setTimeout(() => navigate("/orders"), 2000);
      })
      .catch((err) => {
        console.error("❌ Failed to update order:", err);
        setError("Failed to update order status");
        setLoading(false);
      });
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
        }}
      >
        <div>
          <h2>⚠️ Payment success, but update failed</h2>
          <p>{error}</p>
          <p>Try refreshing or check backend logs.</p>
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
          fontSize: "1.5rem",
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
        background:
          "linear-gradient(135deg, #ecfccb 0%, #d9f99d 50%, #a7f3d0 100%)",
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
      <h1 style={{ fontSize: "2.5rem", fontWeight: "700" }}>
        ✅ Payment Successful!
      </h1>
      <p style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
        Your order has been marked as paid 🎁
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
      >
        🛍️ Back to My Orders
      </button>
    </div>
  );
}
