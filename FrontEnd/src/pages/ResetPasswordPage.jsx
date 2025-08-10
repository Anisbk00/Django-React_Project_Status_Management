/* eslint-disable no-undef */
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const validatePassword = (password) => {
    // Minimum 8 chars, 1 uppercase, 1 number
    return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validatePassword(password)) {
      setMessage('Password must be at least 8 characters, include one uppercase letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/password-reset-confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setSuccess(false);
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    }

    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-600">Invalid password reset link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 px-4">
      <div className="w-full max-w-md bg-white bg-opacity-40 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-extrabold text-indigo-900 mb-6 text-center">
          Reset Your Password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="password" className="block mb-1 font-semibold text-gray-700">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full border rounded-md px-3 py-2 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block mb-1 font-semibold text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full border rounded-md px-3 py-2 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {message && (
            <p className={`text-center ${loading ? 'text-gray-500' : success ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
