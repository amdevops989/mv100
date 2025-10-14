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
