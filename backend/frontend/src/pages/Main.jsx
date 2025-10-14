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

// ✅ Add these imports
import Success from "./Success";
import Cancel from "./Cancel";

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

              {/* ✅ Add these routes */}
              <Route path="/success" element={<Success />} />
              <Route path="/cancel" element={<Cancel />} />
            </Routes>
          </div>
          <Toast message={null} />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
