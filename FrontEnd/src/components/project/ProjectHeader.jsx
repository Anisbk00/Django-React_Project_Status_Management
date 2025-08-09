import StatusBadge from '../ui/StatusBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';


const ProjectHeader = ({ project, status, onBack }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <button 
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <div className="flex items-center mt-1">
            <span className="text-gray-600 text-sm mr-4">Project Code: {project.code}</span>
            <span className="text-gray-600 text-sm">
              Phase: <span className="font-medium">{status.get_phase_display}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-gray-600">Overall Status:</span>
          <StatusBadge status="G" />
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div>
          <p className="text-gray-600">
            <span className="font-medium">Manager:</span> {project.manager_details?.first_name} {project.manager_details?.last_name}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Last Updated:</span> {new Date(status.last_updated).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-100 rounded-lg px-4 py-2">
          <p className="text-sm text-gray-600">
            Status Date: {new Date(status.status_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;