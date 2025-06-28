// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("isAuthenticated") === "true";
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
