// frontend/src/components/ui/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Loader from '../ui/Loader';


const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary',
  size = 'medium',
  disabled = false, 
  loading = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '', 
  fullWidth = false,
  rounded = false
}) => {
  // Base classes for all buttons
  const baseClasses = 'inline-flex items-center justify-center font-medium focus:outline-none transition-all duration-200';
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50',
    warning: 'bg-yellow-500 text-gray-900 hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    'outline-primary': 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    'outline-danger': 'bg-transparent border border-red-600 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50',
  };
  
  // Size classes
  const sizeClasses = {
    small: 'text-xs py-1.5 px-3',
    medium: 'text-sm py-2 px-4',
    large: 'text-base py-2.5 px-5',
  };
  
  // Additional conditional classes
  const disabledClasses = disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';
  const fullWidthClass = fullWidth ? 'w-full' : '';
  const roundedClass = rounded ? 'rounded-full' : 'rounded-md';
  
  // Handle icon positioning
  const iconMarginClass = iconPosition === 'left' ? 'mr-2' : 'ml-2';
  const iconOnlyClass = Icon && !children ? 'p-1.5' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${fullWidthClass}
        ${roundedClass}
        ${iconOnlyClass}
        ${className}
      `}
      aria-busy={loading}
    >
      {/* Loading spinner */}
      {loading && (
        <span className={`${children ? 'mr-2' : ''}`}>
          <Loader size="small" />
        </span>
      )}
      
      {/* Icon (left position) */}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={`h-4 w-4 ${children ? iconMarginClass : ''}`} />
      )}
      
      {/* Button text */}
      {children}
      
      {/* Icon (right position) */}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={`h-4 w-4 ${children ? iconMarginClass : ''}`} />
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf([
    'primary', 
    'secondary', 
    'success', 
    'warning', 
    'danger', 
    'outline', 
    'outline-primary', 
    'outline-danger',
    'ghost'
  ]),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  icon: PropTypes.elementType,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  rounded: PropTypes.bool,
};

Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
  iconPosition: 'left',
};

export default Button;