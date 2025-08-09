// LoginForm.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const LoginForm = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      
      {/* Username */}
      <div className="relative">
        <label
          htmlFor="username"
          className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          {...register('username', { required: 'Username is required' })}
          className="w-full border rounded-md px-3 py-2 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
        />
        {errors.username && (
          <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="relative">
        <label
          htmlFor="password"
          className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500"
        >
          Password
        </label>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          {...register('password', { required: 'Password is required' })}
          className="w-full border rounded-md px-3 py-2 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 pr-10 appearance-none"
        />
        
        {/* Toggle password visibility */}
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
        </button>

        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-indigo-300"
      >
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};

export default LoginForm;
