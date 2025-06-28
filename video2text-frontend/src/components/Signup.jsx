import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include'
      });
      if (res.ok) navigate('/login');
      else alert('Signup failed - email may be taken');
    } catch (err) {
      alert('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 p-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-extrabold text-white tracking-wide mb-2">Create Account</h2>
          <p className="text-indigo-200 font-semibold">Get started with YouTube Sentiment Analyzer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label htmlFor="name" className="block text-indigo-200 font-semibold mb-2">Full Name</label>
            <input
              type="text"
              id="name"
              placeholder="John Doe"
              required
              className="w-full px-5 py-3 rounded-xl border-2 border-indigo-500 bg-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 shadow-md transition duration-300"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-indigo-200 font-semibold mb-2">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your@email.com"
              required
              className="w-full px-5 py-3 rounded-xl border-2 border-indigo-500 bg-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 shadow-md transition duration-300"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-indigo-200 font-semibold mb-2">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              required
              minLength="6"
              className="w-full px-5 py-3 rounded-xl border-2 border-indigo-500 bg-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 shadow-md transition duration-300"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-extrabold text-white text-lg transition-all duration-300 shadow-lg
              ${
                loading
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-600'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
          </button>

          <p className="text-center text-indigo-300 font-semibold">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-purple-300 underline hover:text-purple-200 focus:outline-none"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
