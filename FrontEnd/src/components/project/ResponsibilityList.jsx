import { useState } from 'react';
import ResponsibilityItem from './ResponsibilityItem';
import { PlusIcon } from '@heroicons/react/24/outline';
import { createResponsibility } from '../../api/responsibilities';

const ResponsibilityList = ({ responsibilities = [], onResponsibilityChange, currentUser }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateResponsibility = async () => {
    if (!responsibilities.length) {
      console.warn('No responsibilities available to get project_status from.');
      return;
    }

    setIsCreating(true);
    try {
      const newResponsibility = await createResponsibility({
        title: 'New Responsibility',
        status: 'G',
        progress: 0,
        project_status: responsibilities[0]?.project_status,
      });
      onResponsibilityChange(newResponsibility);
    } catch (error) {
      console.error('Failed to create responsibility:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Responsibilities</h2>
        <button
          onClick={handleCreateResponsibility}
          disabled={isCreating}
          className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors duration-200 ${
            isCreating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
          }`}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {isCreating ? 'Adding...' : 'Add Responsibility'}
        </button>
      </div>

      {responsibilities.length === 0 ? (
        <div className="p-6 text-center text-gray-500 italic select-none">
          No responsibilities found. Click "Add Responsibility" to create one.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {responsibilities.map((responsibility) => (
            <ResponsibilityItem
              key={responsibility.id}
              responsibility={responsibility}
              onChange={onResponsibilityChange}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResponsibilityList;
