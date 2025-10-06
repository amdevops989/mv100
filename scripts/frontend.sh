#!/bin/bash
# ==========================================================
# Fixed React + Vite frontend scaffold (no Tailwind)
# For microservices: auth, catalog, cart, orders
# ==========================================================

APP_NAME="frontend"

echo "🚀 Creating React + Vite app: $APP_NAME"
npm create vite@latest $APP_NAME -- --template react
cd $APP_NAME

echo "📦 Installing dependencies..."
npm install axios react-router-dom

mkdir -p src/{pages,context,lib,styles}

# -------------------------
# src/lib/api.js
# -------------------------
cat <<'EOF' > src/lib/api.js
import axios from "axios";

const API_BASES = {
  auth: "http://localhost:3000",
  catalog: "http://localhost:3001",
  cart: "http://localhost:3002",
  orders: "http://localhost:3003",
};

const api = axios.create();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { api, API_BASES };
EOF

# -------------------------
# src/context/AuthContext.jsx
# -------------------------
cat <<'EOF' > src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { api, API_BASES } from "../lib/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loggedIn, setLoggedIn] = useState(!!token);

  const login = async (email, password) => {
    const res = await api.post(`${API_BASES.auth}/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setLoggedIn(true);
  };

  const signup = async (email, password) => {
    await api.post(`${API_BASES.auth}/signup`, { email, password });
    alert("Signup successful! You can now log in.");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ token, loggedIn, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

# -------------------------
# src/styles/style.css
# -------------------------
cat <<'EOF' > src/styles/style.css
body {
  font-family: 'Segoe UI', sans-serif;
  background: #f8f9fa;
  margin: 0;
  padding: 0;
  color: #333;
}
nav {
  background: #3498db;
  padding: 1rem;
  color: white;
  display: flex;
  justify-content: space-around;
}
nav a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}
.container {
  max-width: 800px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #2980b9;
}
input {
  margin: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
EOF

# -------------------------
# src/App.jsx
# -------------------------
cat <<'EOF' > src/App.jsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import "./styles/style.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <nav>
          <Link to="/">Products</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/login">Login</Link>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
EOF

# -------------------------
# src/pages/Login.jsx
# -------------------------
cat <<'EOF' > src/pages/Login.jsx
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, password);
      alert("Logged in!");
    } catch {
      alert("Login failed");
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <br />
      <button onClick={handleLogin}>Login</button>
      <p>No account? <Link to="/signup">Signup</Link></p>
    </div>
  );
}
EOF

# -------------------------
# src/pages/Signup.jsx
# -------------------------
cat <<'EOF' > src/pages/Signup.jsx
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      await signup(email, password);
    } catch {
      alert("Signup failed");
    }
  };

  return (
    <div>
      <h2>Signup</h2>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <br />
      <button onClick={handleSignup}>Signup</button>
    </div>
  );
}
EOF

# -------------------------
# src/pages/Products.jsx
# -------------------------
cat <<'EOF' > src/pages/Products.jsx
import { useEffect, useState } from "react";
import { api, API_BASES } from "../lib/api";

export default function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get(`${API_BASES.catalog}/products`)
      .then((res) => setProducts(res.data))
      .catch(() => console.error("Catalog fetch failed"));
  }, []);

  const addToCart = async (id) => {
    await api.post(`${API_BASES.cart}/cart/add`, { productId: id, qty: 1 });
    alert("Added to cart");
  };

  return (
    <div>
      <h2>Products</h2>
      {products.map((p) => (
        <div key={p.id}>
          <b>{p.name}</b> — ${p.price}{" "}
          <button onClick={() => addToCart(p.id)}>Add</button>
        </div>
      ))}
    </div>
  );
}
EOF

# -------------------------
# src/pages/Cart.jsx
# -------------------------
cat <<'EOF' > src/pages/Cart.jsx
import { useEffect, useState } from "react";
import { api, API_BASES } from "../lib/api";

export default function Cart() {
  const [cart, setCart] = useState({});

  const fetchCart = async () => {
    const res = await api.get(`${API_BASES.cart}/cart`);
    setCart(res.data);
  };

  useEffect(() => { fetchCart(); }, []);

  const checkout = async () => {
    const res = await api.post(`${API_BASES.cart}/cart/checkout`);
    alert("Order placed: " + JSON.stringify(res.data));
    fetchCart();
  };

  return (
    <div>
      <h2>Your Cart</h2>
      {Object.keys(cart).length === 0 ? (
        <p>Cart empty</p>
      ) : (
        Object.entries(cart).map(([pid, qty]) => (
          <div key={pid}>Product #{pid} — Qty: {qty}</div>
        ))
      )}
      <br />
      <button onClick={checkout}>Checkout</button>
    </div>
  );
}
EOF

# -------------------------
# src/pages/Orders.jsx
# -------------------------
cat <<'EOF' > src/pages/Orders.jsx
import { useEffect, useState } from "react";
import { api, API_BASES } from "../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get(`${API_BASES.orders}/orders`)
      .then((res) => setOrders(res.data))
      .catch(() => console.error("Orders fetch failed"));
  }, []);

  return (
    <div>
      <h2>Your Orders</h2>
      {orders.length === 0 ? <p>No orders yet</p> :
        orders.map((o) => (
          <div key={o.id}>Order #{o.id} — Total: ${o.total}</div>
        ))}
    </div>
  );
}
EOF

echo "✅ Frontend scaffold complete!"
echo "Run the following:"
echo "cd $APP_NAME && npm run dev"
