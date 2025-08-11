import React from 'react';
import PropTypes from 'prop-types';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    G: { text: 'Green', color: 'bg-green-500' },   // replace with your 'bg-status-green' if defined
    Y: { text: 'Yellow', color: 'bg-yellow-400' }, // replace with 'bg-status-yellow'
    R: { text: 'Red', color: 'bg-red-500' },       // replace with 'bg-status-red'
  };

  const config = statusConfig[status] || statusConfig.G;

  return (
    <span
      role="status"
      aria-label={`${config.text} status`}
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold text-white select-none ${config.color} drop-shadow-sm`}
    >
      {config.text}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['G', 'Y', 'R']).isRequired,
};

export default StatusBadge;
