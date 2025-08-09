import React from 'react';
import PropTypes from 'prop-types';

const Loader = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-3 w-3',
    medium: 'h-4 w-4',
    large: 'h-5 w-5',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`}
      role="status"
      aria-hidden="true"
    />
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

Loader.defaultProps = {
  size: 'medium',
};

export default Loader;
