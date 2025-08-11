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
    normal: 'p-5 md:p-6',
    loose: 'p-7 md:p-8',
  };
  
  return (
    <div 
      className={`
        rounded-2xl bg-white shadow-sm
        ${border ? 'border border-gray-200' : ''}
        ${hoverEffect ? 'transition-all duration-300 hover:shadow-lg hover:scale-[1.02]' : ''}
        ${className}
      `}
    >
      {(title || subtitle || headerActions) && (
        <div className={`
          flex items-center justify-between gap-4 border-b border-gray-200
          ${padding === 'tight' ? 'py-2 px-3' : padding === 'loose' ? 'py-5 px-6' : 'py-4 px-5'}
        `}>
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 leading-snug">
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
          bg-gray-50 border-t border-gray-200 rounded-b-2xl
          ${padding === 'tight' ? 'py-2 px-3' : padding === 'loose' ? 'py-5 px-6' : 'py-4 px-5'}
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
  hoverEffect: false,
};

export default Card;
