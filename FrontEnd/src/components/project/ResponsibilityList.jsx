import ResponsibilityItem from './ResponsibilityItem';
import { PlusIcon } from '@heroicons/react/outline';
import { createResponsibility } from '../../api/responsibilities';

const ResponsibilityList = ({ 
  responsibilities, 
  onResponsibilityChange,
  currentUser
}) => {
  const handleCreateResponsibility = async () => {
    try {
      const newResponsibility = await createResponsibility({
        title: 'New Responsibility',
        status: 'G',
        progress: 0,
        project_status: responsibilities[0].project_status
      });
      
      onResponsibilityChange(newResponsibility);
    } catch (error) {
      console.error('Failed to create responsibility:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Responsibilities</h2>
          <button
            onClick={handleCreateResponsibility}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Responsibility
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {responsibilities.map(responsibility => (
          <ResponsibilityItem 
            key={responsibility.id}
            responsibility={responsibility}
            onChange={onResponsibilityChange}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
};

export default ResponsibilityList;