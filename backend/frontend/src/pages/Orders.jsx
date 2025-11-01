// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { loadStripe } from "@stripe/stripe-js";

// // Load Stripe from environment variable
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

// export default function Orders() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const token = localStorage.getItem("token");

//   useEffect(() => {
//     fetchOrders();
//     const params = new URLSearchParams(window.location.search);
//     if (params.get("payment") === "success") {
//       setTimeout(() => fetchOrders(), 2000);
//     }
//   }, []);

//   // Fetch orders + product info
//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("http://localhost:3003/orders", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const ordersWithProducts = await Promise.all(
//         res.data.map(async (order) => {
//           try {
//             const prodRes = await axios.get(
//               `http://localhost:3001/products/${order.product_id || order.id}`
//             );
//             return { ...order, product: prodRes.data };
//           } catch {
//             return { ...order, product: null };
//           }
//         })
//       );

//       setOrders(ordersWithProducts);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePay = async (order) => {
//     try {
//       const stripe = await stripePromise;
//       const res = await axios.post(
//         "http://localhost:3004/payments/create-checkout-session",
//         { orderId: order.id, amount: order.amount },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       window.location.href = res.data.url;
//     } catch (err) {
//       console.error("Payment error:", err);
//       alert("❌ Payment failed");
//     }
//   };

//   if (loading) return <div className="loading">Loading...</div>;

//   return (
//     <div style={{ padding: "2rem", background: "#f5f7fa", minHeight: "100vh" }}>
//       <h1 style={{ textAlign: "center" }}>🛒 My Orders</h1>

//       {orders.length === 0 ? (
//         <p style={{ textAlign: "center" }}>No orders yet.</p>
//       ) : (
//         <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
//           {orders.map((order) => (
//             <div
//               key={order.id}
//               style={{
//                 display: "flex",
//                 flexDirection: "row",
//                 gap: "1rem",
//                 background: "white",
//                 borderRadius: "10px",
//                 padding: "1rem",
//                 boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//               }}
//             >
//               {order.product?.image_url && (
//                 <img
//                   src={order.product.image_url}
//                   alt={order.product.name}
//                   style={{
//                     width: "120px",
//                     height: "120px",
//                     objectFit: "cover",
//                     borderRadius: "10px",
//                   }}
//                 />
//               )}
//               <div style={{ flexGrow: 1, minWidth: "180px" }}>
//                 <h3 style={{ margin: "0" }}>{order.product?.name || `Order #${order.id}`}</h3>
//                 <p style={{ margin: "0.2rem 0", color: "#666", fontSize: "0.9rem" }}>
//                   {order.product?.description || ""}
//                 </p>
//                 <p style={{ margin: "0.2rem 0" }}>💰 Amount: ${order.amount}</p>
//                 <p
//                   style={{
//                     margin: "0.2rem 0",
//                     fontWeight: "bold",
//                     color: order.status === "paid" ? "green" : "orange",
//                   }}
//                 >
//                   Status: {order.status.toUpperCase()}
//                 </p>
//               </div>
//               {order.status !== "paid" && (
//                 <button
//                   onClick={() => handlePay(order)}
//                   style={{
//                     background: "linear-gradient(90deg, #4f46e5, #9333ea)",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "6px",
//                     padding: "0.5rem 1rem",
//                     cursor: "pointer",
//                     whiteSpace: "nowrap",
//                   }}
//                 >
//                   💳 Pay
//                 </button>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";

// ✅ Load Stripe from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

// ✅ Backend endpoints from env variables
const API_ORDERS = import.meta.env.VITE_API_ORDERS;
const API_PRODUCTS = import.meta.env.VITE_API_CATALOG; // Catalog service for product info
const API_PAYMENTS = import.meta.env.VITE_API_PAYMENTS;

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

  // 🧩 Fetch orders + product info
  const fetchOrders = async () => {
    try {
      const res = await axios.get(API_ORDERS, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ordersWithProducts = await Promise.all(
        res.data.map(async (order) => {
          try {
            const prodRes = await axios.get(
              `${API_PRODUCTS}/${order.product_id || order.id}`
            );
            return { ...order, product: prodRes.data };
          } catch {
            return { ...order, product: null };
          }
        })
      );

      setOrders(ordersWithProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 💳 Stripe checkout
  const handlePay = async (order) => {
    try {
      const stripe = await stripePromise;
      const res = await axios.post(
        `${API_PAYMENTS}/create-checkout-session`,
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
                display: "flex",
                flexDirection: "row",
                gap: "1rem",
                background: "white",
                borderRadius: "10px",
                padding: "1rem",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {order.product?.image_url && (
                <img
                  src={order.product.image_url}
                  alt={order.product.name}
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                />
              )}
              <div style={{ flexGrow: 1, minWidth: "180px" }}>
                <h3 style={{ margin: "0" }}>
                  {order.product?.name || `Order #${order.id}`}
                </h3>
                <p style={{ margin: "0.2rem 0", color: "#666", fontSize: "0.9rem" }}>
                  {order.product?.description || ""}
                </p>
                <p style={{ margin: "0.2rem 0" }}>💰 Amount: ${order.amount}</p>
                <p
                  style={{
                    margin: "0.2rem 0",
                    fontWeight: "bold",
                    color: order.status === "paid" ? "green" : "orange",
                  }}
                >
                  Status: {order.status.toUpperCase()}
                </p>
              </div>
              {order.status !== "paid" && (
                <button
                  onClick={() => handlePay(order)}
                  style={{
                    background: "linear-gradient(90deg, #4f46e5, #9333ea)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
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
