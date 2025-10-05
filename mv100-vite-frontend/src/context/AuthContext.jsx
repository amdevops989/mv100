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
