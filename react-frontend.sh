#!/usr/bin/env bash
set -euo pipefail

APP="mv100-vite-frontend"
# echo "Creating React + Vite app: $APP"

# # Create project with Vite (React template)
# npm create vite@latest "$APP" -- --template react

# cd "$APP"

# echo "Installing dependencies..."
# npm install

# # Add deps: axios for HTTP and jwt-decode (optional), react-router for routing
# npm install axios react-router-dom jwt-decode

# # create folders
# mkdir -p src/{components,context,pages,lib,styles}

###########################
# src/lib/api.js
###########################
cat > src/lib/api.js <<'JS'
import axios from "axios";

export const BASES = {
  auth: "http://localhost:3000",
  catalog: "http://localhost:3001",
  cart: "http://localhost:3002",
  orders: "http://localhost:3003",
  payments: "http://localhost:3004",
};

// shared axios client with token interceptor
const client = axios.create({ timeout: 10000 });

client.interceptors.request.use(cfg => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
    }
  } catch (e) {}
  return cfg;
});

export default client;
JS

###########################
# src/context/AuthContext.jsx
###########################
cat > src/context/AuthContext.jsx <<'JS'
import React, { createContext, useEffect, useState } from "react";
import client, { BASES } from "../lib/api";

// AuthContext provides: user (email), login, signup, logout, isAuthenticated
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const isAuthenticated = !!user;

  async function login(email, password) {
    const res = await client.post(`${BASES.auth}/login`, { email, password });
    if (!res.data || !res.data.token) throw new Error("Invalid login response");
    localStorage.setItem("token", res.data.token);
    // store user email locally for display (server may not return the user)
    const u = { email };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }

  async function signup(email, password) {
    const res = await client.post(`${BASES.auth}/signup`, { email, password });
    return res.data;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  }

  useEffect(() => {
    // if token exists but no user, try to populate user from localStorage
    const token = localStorage.getItem("token");
    if (token && !user) {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
JS

###########################
# src/context/CartContext.jsx
###########################
cat > src/context/CartContext.jsx <<'JS'
import React, { createContext, useEffect, useState, useContext } from "react";
import client, { BASES } from "../lib/api";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cart_local");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  // helper: compute total count
  const count = Object.values(items).reduce((s, v) => s + Number(v || 0), 0);

  // sync local cart to localStorage
  useEffect(() => {
    try { localStorage.setItem("cart_local", JSON.stringify(items)); } catch {}
  }, [items]);

  // If logged in, optionally fetch server cart and merge
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const r = await client.get(`${BASES.cart}/cart`);
        // r.data is object of pid->qty
        const server = r.data || {};
        // merge server into local (server authoritative for this demo)
        setItems(server);
      } catch (e) {
        console.warn("Could not fetch server cart", e.message);
      }
    })();
  }, [isAuthenticated]);

  // Add item: optimistic update + server call
  async function addToCart(productId, qty = 1) {
    // optimistic local update
    setItems(prev => {
      const copy = { ...prev };
      copy[productId] = (Number(copy[productId] || 0) + Number(qty));
      return copy;
    });

    if (!isAuthenticated) {
      // no server sync when not authenticated
      return;
    }

    try {
      await client.post(`${BASES.cart}/cart/add`, { productId, qty });
      // fetch server cart to ensure exact state
      const r = await client.get(`${BASES.cart}/cart`);
      setItems(r.data || {});
    } catch (e) {
      console.error("addToCart failed:", e.message);
      // rollback could be implemented; for now re-fetch
      try {
        const r = await client.get(`${BASES.cart}/cart`);
        setItems(r.data || {});
      } catch {}
    }
  }

  async function checkout() {
    if (!isAuthenticated) throw new Error("Login required");
    const res = await client.post(`${BASES.cart}/cart/checkout`);
    // server empties cart; refresh
    setItems({});
    return res.data;
  }

  return (
    <CartContext.Provider value={{ items, addToCart, checkout, count }}>
      {children}
    </CartContext.Provider>
  );
}
JS

###########################
# src/components/Nav.jsx
###########################
cat > src/components/Nav.jsx <<'JS'
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

export default function Nav() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const { count } = useContext(CartContext);

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">MicroStore</Link>
      </div>

      <div className="nav-center">
        <Link to="/">Products</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/orders">Orders</Link>
      </div>

      <div className="nav-right">
        <Link to="/cart" className="cart-btn">
          Cart <span className="badge">{count}</span>
        </Link>

        {isAuthenticated ? (
          <>
            <span className="user">Hi, {user?.email}</span>
            <button onClick={logout} className="btn small">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn small">Login</Link>
            <Link to="/signup" className="btn small">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
JS

###########################
# src/components/Toast.jsx
###########################
cat > src/components/Toast.jsx <<'JS'
import React from "react";

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed",
      right: 20,
      bottom: 20,
      background: "rgba(0,0,0,0.8)",
      color: "white",
      padding: "10px 14px",
      borderRadius: 8,
      zIndex: 9999
    }}>
      {message}
    </div>
  );
}
JS

###########################
# src/pages/Main.jsx (App root)
###########################
cat > src/pages/Main.jsx <<'JS'
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import Nav from "../components/Nav";
import Products from "./Products";
import CartPage from "./Cart";
import Orders from "./Orders";
import Login from "./Login";
import Signup from "./Signup";
import Toast from "../components/Toast";

export default function Main() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Nav />
          <div className="container">
            <Routes>
              <Route path="/" element={<Products />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Routes>
          </div>
          <Toast message={null} />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
JS

###########################
# src/pages/Products.jsx
###########################
cat > src/pages/Products.jsx <<'JS'
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
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1>Products</h1>
      {loading && <div>Loading...</div>}
      <div className="products-grid">
        {products.map(p => (
          <div className="card" key={p.id}>
            <div className="product-title">{p.name}</div>
            <div className="small">{p.description}</div>
            <div className="space-between" style={{marginTop:12}}>
              <div><strong>${p.price}</strong></div>
              <button className="btn" onClick={() => addToCart(p.id, 1)}>Add</button>
            </div>
          </div>
        ))}
        {!loading && products.length === 0 && <div className="card">No products found</div>}
      </div>
    </div>
  );
}
JS

###########################
# src/pages/Cart.jsx
###########################
cat > src/pages/Cart.jsx <<'JS'
import React, { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function Cart() {
  const { items, checkout } = useContext(CartContext);

  const entries = Object.entries(items || {});

  return (
    <div>
      <h1>Your Cart</h1>
      <div className="card">
        {entries.length === 0 && <div>Cart is empty</div>}
        {entries.map(([pid, qty]) => (
          <div key={pid} className="order-row">
            <div>Product #{pid}</div>
            <div>Qty: {qty}</div>
          </div>
        ))}
      </div>
      {entries.length > 0 && <button className="btn" onClick={() => checkout().then(d => alert("Order created: " + JSON.stringify(d))).catch(e => alert(e.message))}>Checkout</button>}
    </div>
  );
}
JS

###########################
# src/pages/Orders.jsx
###########################
cat > src/pages/Orders.jsx <<'JS'
import React, { useEffect, useState } from "react";
import client, { BASES } from "../lib/api";

export default function Orders(){
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`${BASES.orders}/orders`);
        setOrders(res.data || []);
      } catch (e) {
        console.error("Orders fetch failed", e.message);
      }
    })();
  }, []);
  return (
    <div>
      <h1>Your Orders</h1>
      {orders.length === 0 && <div className="card">No orders yet</div>}
      {orders.map(o => (
        <div className="card order-row" key={o.id}>
          <div>
            <div><strong>Order #{o.id}</strong></div>
            <div className="small">Amount: ${o.amount} • Status: {o.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
JS

###########################
# src/pages/Login.jsx
###########################
cat > src/pages/Login.jsx <<'JS'
import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      alert("Logged in");
      window.location.href = "/";
    } catch(err) {
      alert("Login failed: " + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Login</h1>
      <form className="card" onSubmit={submit}>
        <input className="input" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <br/>
        <input className="input" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <br/>
        <button className="btn" type="submit" disabled={loading}>{loading ? "Logging..." : "Login"}</button>
      </form>
    </div>
  );
}
JS

###########################
# src/pages/Signup.jsx
###########################
cat > src/pages/Signup.jsx <<'JS'
import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password);
      alert("Account created. Please login.");
      window.location.href = "/login";
    } catch(err) {
      alert("Signup failed: " + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Signup</h1>
      <form className="card" onSubmit={submit}>
        <input className="input" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <br/>
        <input className="input" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <br/>
        <button className="btn" type="submit" disabled={loading}>{loading ? "Signing..." : "Signup"}</button>
      </form>
    </div>
  );
}
JS

###########################
# src/main.jsx
###########################
cat > src/main.jsx <<'JS'
import React from "react";
import { createRoot } from "react-dom/client";
import Main from "./pages/Main";
import "./styles/app.css";
createRoot(document.getElementById("root")).render(<Main />);
JS

###########################
# styles/app.css (modern look)
###########################
cat > src/styles/app.css <<'CSS'
:root{
  --bg:#0f1724; /* dark cosmic background for modern vibe */
  --card:#0b1220;
  --accent: #7c5cff;
  --accent-2: #00d4ff;
  --muted:#9ca3af;
  --glass: rgba(255,255,255,0.04);
}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{
  margin:0;
  font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  background: linear-gradient(180deg, #071025 0%, #08142b 100%);
  color:#e6eef8;
  -webkit-font-smoothing:antialiased;
}
.container { max-width:1100px; margin:28px auto; padding:20px; }
.nav{
  display:flex; align-items:center; gap:16px; padding:12px 20px; border-radius:12px; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  margin-bottom:18px;
}
.nav .brand { font-weight:700; font-size:1.1rem; margin-right:12px; color:var(--accent); text-decoration:none }
.nav a { color: #cfe9ff; text-decoration:none; margin-right:8px }
.nav-right { margin-left:auto; display:flex; gap:12px; align-items:center }
.btn { background: linear-gradient(90deg,var(--accent),var(--accent-2)); border:none; color:#051022; padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:600; }
.btn.small { padding:6px 10px; font-size:0.9rem }
.input { padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:inherit; width:100%; max-width:360px }
.card { background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); padding:14px; border-radius:12px; box-shadow: 0 6px 30px rgba(10,15,25,0.6); margin-bottom:14px; }
.products-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px; }
.product-title { font-weight:700; font-size:1.05rem; }
.small { color:var(--muted); font-size:0.9rem }
.space-between { display:flex; justify-content:space-between; align-items:center; gap:12px }
.order-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed rgba(255,255,255,0.02) }
.badge { background: rgba(255,255,255,0.06); padding:6px 8px; border-radius:8px; font-size:0.9rem }
.nav .badge { background: rgba(255,255,255,0.08); color:#fff; padding:4px 8px; border-radius:999px; margin-left:8px; }
CSS

###########################
# Update package.json start script to use Vite (already exists). ensure index.html exists
###########################
cat > index.html <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MicroStore</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
HTML


###########################
# Clean up: install again and print instructions
###########################
npm install

echo
echo "========================================"
echo "DONE — Frontend created: $(pwd)"
echo
echo "Run the app:"
echo "  cd $(pwd)"
echo "  npm run dev"
echo
echo "Important notes:"
echo "- Frontend expects backend services at:"
echo "    auth:   http://localhost:3000"
echo "    catalog: http://localhost:3001"
echo "    cart:   http://localhost:3002"
echo "    orders: http://localhost:3003"
echo "    payments: http://localhost:3004"
echo "- When user logs in, email is stored locally and will appear in nav automatically."
echo "- Cart badge updates instantly because CartContext updates state on addToCart (optimistic)."
echo "- Make sure your backend has CORS enabled (app.use(require('cors')()))."
echo "========================================"
