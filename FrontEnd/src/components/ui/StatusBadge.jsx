const StatusBadge = ({ status }) => {
  const statusConfig = {
    G: { text: 'Green', color: 'bg-status-green' },
    Y: { text: 'Yellow', color: 'bg-status-yellow' },
    R: { text: 'Red', color: 'bg-status-red' },
  };

  const config = statusConfig[status] || statusConfig.G;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.text}
    </span>
  );
};

export default StatusBadge;