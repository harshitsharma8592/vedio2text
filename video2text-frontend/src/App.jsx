import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import TranscriptApp from "./components/TranscriptApp";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function NavBar() {
  const [open, setOpen] = useState(false);
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setOpen(false);
    navigate("/login");
  };

  return (
    <nav className="p-4 bg-gray-800 text-white flex items-center justify-between">
      <div className="flex gap-4">
        <Link to="/transcript" className="hover:underline">Transcribe</Link>
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
      </div>
      <div className="relative">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            <path stroke="currentColor" strokeWidth="2" d="M5.5 21a7.5 7.5 0 0113 0" />
          </svg>
          <span className="font-semibold">Account</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white text-gray-900 rounded-lg shadow-lg z-50">
            {!isAuthenticated ? (
              <>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                  onClick={() => { setOpen(false); navigate("/login"); }}
                >
                  Login
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg"
                  onClick={() => { setOpen(false); navigate("/signup"); }}
                >
                  Signup
                </button>
              </>
            ) : (
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                onClick={handleLogout}
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/transcript"
          element={
            <ProtectedRoute>
              <TranscriptApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}