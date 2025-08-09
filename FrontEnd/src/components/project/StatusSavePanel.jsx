import { CheckCircleIcon, DocumentTextIcon, FlagIcon } from '@heroicons/react/24/outline';

const StatusSavePanel = ({ onSave, isSaving, isBaseline, isFinal }) => {
  const saveOptions = [
    {
      id: 'status',
      title: 'Save Status Report',
      description: 'Save the current status as a regular progress update',
      icon: DocumentTextIcon,
      color: 'bg-blue-600',
      disabled: false
    },
    {
      id: 'baseline',
      title: 'Save Baseline',
      description: 'Set this status as the project baseline for future comparisons',
      icon: FlagIcon,
      color: 'bg-green-600',
      disabled: isBaseline
    },
    {
      id: 'final',
      title: 'Save Final Report',
      description: 'Mark this as the final project status report',
      icon: CheckCircleIcon,
      color: 'bg-purple-600',
      disabled: isFinal
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Save Status</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {saveOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSave(option.id)}
            disabled={option.disabled || isSaving}
            className={`relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-left focus:outline-none hover:border-gray-300 ${
              option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center">
              <span className={`${option.color} p-2 rounded-md`}>
                <option.icon className="h-6 w-6 text-white" />
              </span>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">{option.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
            
            {option.disabled && (
              <div className="absolute top-2 right-2 bg-gray-100 rounded-full px-2 py-1 text-xs font-medium text-gray-500">
                Saved
              </div>
            )}
            
            {isSaving && !option.disabled && (
              <div className="absolute top-2 right-2 animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusSavePanel;