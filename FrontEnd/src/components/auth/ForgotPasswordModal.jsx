/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { FaTimes, FaEnvelope } from 'react-icons/fa';

const ForgotPasswordModal = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    // Simple regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/password-reset-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      setMessage(data.message || 'If the email exists, a reset link will be sent.');
    } catch (error) {
      setMessage('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeSlide">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-purple-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-purple-500 transition-colors"
        >
          <FaTimes size={18} />
        </button>

        <h2 className="mb-2 text-xl font-extrabold text-purple-700 text-center">
          Reset Your Password
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Enter your email address and we’ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4 group">
            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-300 group-focus-within:text-purple-500 group-focus-within:scale-110 group-focus-within:drop-shadow-glow" />
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 bg-white text-gray-800 placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-300 transition-all"
              disabled={loading}
            />
          </div>

          {message && <p className="mb-4 text-center text-sm text-red-600">{message}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 py-2 text-white font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>

      <style>{`
        .animate-fadeSlide {
          animation: fadeSlide 0.3s ease-out;
        }
        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.7));
        }
      `}</style>
    </div>
  );
};

export default ForgotPasswordModal;
