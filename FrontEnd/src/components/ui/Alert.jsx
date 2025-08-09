import React from 'react';
import PropTypes from 'prop-types';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  className = '',
  children 
}) => {
  const alertConfig = {
    success: {
      icon: CheckCircleIcon,
      bg: 'bg-green-50',
      text: 'text-green-800',
      title: 'text-green-800',
      iconColor: 'text-green-400',
      border: 'border-green-200',
    },
    error: {
      icon: ExclamationCircleIcon,
      bg: 'bg-red-50',
      text: 'text-red-800',
      title: 'text-red-800',
      iconColor: 'text-red-400',
      border: 'border-red-200',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      title: 'text-yellow-800',
      iconColor: 'text-yellow-400',
      border: 'border-yellow-200',
    },
    info: {
      icon: InformationCircleIcon,
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      title: 'text-blue-800',
      iconColor: 'text-blue-400',
      border: 'border-blue-200',
    },
  };

  const config = alertConfig[type] || alertConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className={`rounded-md p-4 border ${config.bg} ${config.border} ${className}`}
      role="alert"
      aria-live={onClose ? 'assertive' : 'polite'}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.title}`}>
              {title}
            </h3>
          )}
          <div className={`mt-2 text-sm ${config.text}`}>
            {message || children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md ${config.bg} p-1.5 ${config.text} hover:${config.bg.replace('50', '100')} focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.iconColor.replace('400', '500')}`}
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Alert.propTypes = {
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  title: PropTypes.string,
  message: PropTypes.string,
  onClose: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default Alert;