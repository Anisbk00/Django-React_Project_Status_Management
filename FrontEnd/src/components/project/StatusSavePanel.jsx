/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { CheckCircleIcon, DocumentTextIcon, FlagIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const StatusSavePanel = ({ onSave, isSaving, isBaseline, isFinal }) => {
  const [lastSaved, setLastSaved] = useState(null);

  const saveOptions = [
    {
      id: 'status',
      title: 'Save Status Report',
      description: 'Save the current status as a regular progress update',
      icon: DocumentTextIcon,
      color: 'bg-blue-600',
      disabled: isSaving || false,
    },
    {
      id: 'baseline',
      title: 'Save Baseline',
      description: 'Set this status as the project baseline for future comparisons',
      icon: FlagIcon,
      color: 'bg-green-600',
      disabled: isBaseline || isSaving,
    },
    {
      id: 'final',
      title: 'Save Final Report',
      description: 'Mark this as the final project status report',
      icon: CheckCircleIcon,
      color: 'bg-purple-600',
      disabled: isFinal || isSaving,
    },
  ];

  const handleSave = (id) => {
    onSave(id);
    setLastSaved(id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Save Status</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {saveOptions.map(({ id, title, description, icon: Icon, color, disabled }) => {
          const isLoading = isSaving && !disabled;
          const isLastSaved = lastSaved === id;

          return (
            <button
              key={id}
              onClick={() => !disabled && handleSave(id)}
              disabled={disabled}
              aria-pressed={disabled}
              aria-busy={isLoading}
              className={`
                relative flex items-center justify-between bg-white border rounded-lg p-4
                text-left shadow-sm transition
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:shadow-lg hover:border-gray-300'}
                ${isLastSaved ? 'border-blue-500 shadow-lg' : ''}
              `}
            >
              <div className="flex items-center space-x-4">
                <span className={`${color} p-2 rounded-md flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-medium text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                </div>
              </div>

              <div className="ml-4 flex-shrink-0 relative">
                {disabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 select-none">
                    Saved
                  </span>
                ) : isLoading ? (
                  <svg
                    className="animate-spin h-6 w-6 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="Loading"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : isLastSaved ? (
                  <AnimatePresence>
                    <motion.span
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 select-none"
                    >
                      Saved
                    </motion.span>
                  </AnimatePresence>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StatusSavePanel;
