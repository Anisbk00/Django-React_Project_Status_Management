// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';


const LoginPage = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (credentials) => {
    try {
      setError('');
      const result = await login(credentials.username, credentials.password);
      console.log('Login success, user:', result.user);
      setSuccess(true);
      setTimeout(() => {
        console.log('Navigating to /dashboard');
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white bg-opacity-40 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-extrabold text-indigo-900 mb-2 text-center">
          Project Status Tracker
        </h1>
        <p className="text-indigo-700 mb-6 text-center font-medium">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-800 p-3 text-center font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 text-green-800 p-3 text-center font-semibold">
            Login successful! Redirecting...
          </div>
        )}

        {!success && <LoginForm onSubmit={handleLogin} />}

        {!success && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 focus:underline"
            >
              Forgot password?
            </button>
          </div>
        )}
      </div>

      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
};

export default LoginPage;
