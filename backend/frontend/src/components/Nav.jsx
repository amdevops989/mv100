import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const { count } = useContext(CartContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      {/* Hamburger for mobile */}
      {isMobile && (
        <div
          className="hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          ☰
        </div>
      )}

      {/* Brand / Logo */}
      <div className="navbar-brand" onClick={() => navigate("/")}>
        MicroStore
      </div>

      {/* Links */}
      <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Products</Link>
        <Link to="/orders" onClick={() => setMenuOpen(false)}>Orders</Link>
        {isAuthenticated ? (
          <>
            <span>👋 {user?.name || user?.email}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => { navigate("/login"); setMenuOpen(false); }}>Login</button>
            <button onClick={() => { navigate("/signup"); setMenuOpen(false); }}>Signup</button>
          </>
        )}
      </div>

      {/* Cart always visible */}
      <div
        className="cart"
        onClick={() => { navigate("/cart"); setMenuOpen(false); }}
      >
        🛍️ Cart ({count})
      </div>
    </nav>
  );
}
