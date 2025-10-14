// import React, { useEffect, useState, useContext } from "react";
// import client, { BASES } from "../lib/api";
// import { CartContext } from "../context/CartContext";

// export default function Products() {
//   const [products, setProducts] = useState([]);
//   const { addToCart } = useContext(CartContext);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await client.get(`${BASES.catalog}/products`);
//         setProducts(res.data || []);
//       } catch (e) {
//         console.error("Products fetch failed", e.message);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background:
//           "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(218,238,255,1) 25%, rgba(250,220,255,1) 75%)",
//         padding: "2rem",
//       }}
//     >
//       <h1 style={{ textAlign: "center", color: "#333" }}>🛍️ Products</h1>

//       {loading ? (
//         <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</div>
//       ) : products.length === 0 ? (
//         <div style={{ textAlign: "center", marginTop: "2rem", color: "#555" }}>
//           No products found
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
//             gap: "1.5rem",
//             marginTop: "2rem",
//           }}
//         >
//           {products.map((p) => (
//             <div
//               key={p.id}
//               style={{
//                 backgroundColor: "#fff",
//                 borderRadius: "15px",
//                 boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
//                 padding: "1.5rem",
//                 transition: "transform 0.3s ease",
//               }}
//               onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
//               onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
//             >
//               <h3 style={{ color: "#444", marginBottom: "0.5rem" }}>{p.name}</h3>
//               <p style={{ color: "#666", fontSize: "0.9rem" }}>{p.description}</p>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   marginTop: "1.2rem",
//                 }}
//               >
//                 <strong style={{ fontSize: "1.1rem" }}>${p.price}</strong>
//                 <button
//                   onClick={() => addToCart(p.id, 1)}
//                   style={{
//                     background: "linear-gradient(90deg, #4f46e5, #9333ea)",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "10px",
//                     padding: "0.5rem 1rem",
//                     cursor: "pointer",
//                     transition: "opacity 0.2s",
//                   }}
//                   onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
//                   onMouseLeave={(e) => (e.target.style.opacity = "1")}
//                 >
//                   ➕ Add
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState, useContext } from "react";
import client, { BASES } from "../lib/api";
import { CartContext } from "../context/CartContext";

export default function Products() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useContext(CartContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`${BASES.catalog}/products`);
        setProducts(res.data || []);
      } catch (e) {
        console.error("Products fetch failed", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(218,238,255,1) 25%, rgba(250,220,255,1) 75%)",
        padding: "2rem",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>🛍️ Products</h1>

      {loading ? (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "2rem", color: "#555" }}>
          No products found
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: "2rem",
          }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: "15px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                padding: "1rem",
                transition: "transform 0.3s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "1rem",
                  }}
                />
              )}
              <h3 style={{ color: "#444", marginBottom: "0.5rem" }}>{p.name}</h3>
              <p style={{ color: "#666", fontSize: "0.9rem", flexGrow: 1 }}>
                {p.description || "No description available."}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1rem",
                }}
              >
                <strong style={{ fontSize: "1.1rem" }}>${p.price}</strong>
                <button
                  onClick={() => addToCart(p.id, 1)}
                  style={{
                    background: "linear-gradient(90deg, #4f46e5, #9333ea)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.target.style.opacity = "1")}
                >
                  ➕ Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
