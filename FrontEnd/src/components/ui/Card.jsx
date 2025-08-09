import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  title, 
  subtitle,
  children, 
  footer, 
  headerActions, 
  className = '',
  hoverEffect = false,
  border = true,
  padding = 'normal'
}) => {
  const paddingClasses = {
    none: '',
    tight: 'p-2',
    normal: 'p-4 md:p-6',
    loose: 'p-6 md:p-8',
  };
  
  return (
    <div 
      className={`
        rounded-lg bg-white shadow-sm 
        ${border ? 'border border-gray-200' : ''}
        ${hoverEffect ? 'transition-all duration-200 hover:shadow-md hover:border-gray-300' : ''}
        ${className}
      `}
    >
      {(title || subtitle || headerActions) && (
        <div className={`
          px-4 py-3 border-b border-gray-200 
          ${padding === 'tight' ? 'py-2 px-3' : padding === 'loose' ? 'py-4 px-6' : 'py-3 px-4'}
          flex items-center justify-between gap-3
        `}>
          <div>
            {title && (
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}
      
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      
      {footer && (
        <div className={`
          px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg
          ${padding === 'tight' ? 'py-2 px-3' : padding === 'loose' ? 'py-4 px-6' : 'py-3 px-4'}
        `}>
          {footer}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  headerActions: PropTypes.node,
  className: PropTypes.string,
  hoverEffect: PropTypes.bool,
  border: PropTypes.bool,
  padding: PropTypes.oneOf(['none', 'tight', 'normal', 'loose']),
};

Card.defaultProps = {
  padding: 'normal',
  border: true,
};

export default Card;