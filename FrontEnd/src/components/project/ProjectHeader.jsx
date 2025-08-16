/* eslint-disable no-unused-vars */
import StatusBadge from '../ui/StatusBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ProjectHeader = ({ project, status, onBack }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="flex-1 ml-6">
          <h1 className="text-3xl font-extrabold text-gray-900 truncate">
            {project.name}
          </h1>
          <div className="flex items-center space-x-6 mt-1 text-gray-600 text-sm">
            <span>
              <span className="font-semibold">Project Code:</span> {project.code}
            </span>
            <span>
              <span className="font-semibold">Phase:</span> {project.phase_display}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 ml-6 whitespace-nowrap">
          <span className="text-gray-600 font-medium">Overall Status:</span>
          <StatusBadge status="G" />
        </div>
      </div>

      {/* Project Meta */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="space-y-1 text-gray-700 text-sm md:text-base">
          <p>
            <span className="font-semibold">Manager:</span>{' '}
            {project.manager_details
              ? (project.manager_details.first_name || project.manager_details.username) +
                (project.manager_details.last_name
                  ? ` ${project.manager_details.last_name}`
                  : '')
              : 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Last Updated:</span>{' '}
            {project.updated_at
              ? new Date(project.updated_at).toLocaleDateString()
              : '—'}
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg px-5 py-2 text-gray-600 text-sm font-medium">
          Start Date: {new Date(project.start_date).toLocaleDateString()}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-gray-800 font-semibold mb-2">Description</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectHeader;
