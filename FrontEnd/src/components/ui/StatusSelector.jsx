const StatusSelector = ({ value, onChange }) => {
  const statusOptions = [
    { value: 'G', label: 'Green', color: 'bg-status-green' },
    { value: 'Y', label: 'Yellow', color: 'bg-status-yellow' },
    { value: 'R', label: 'Red', color: 'bg-status-red' },
  ];

  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {statusOptions.map(option => (
        <button
          key={option.value}
          type="button"
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            value === option.value
              ? `${option.color} text-white`
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default StatusSelector;