import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const StatusTimeline = ({ statuses, currentStatusId, projectId }) => {
  if (!statuses || statuses.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Status History</h2>
      </div>
      
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {statuses.map((status, index) => (
              <li key={status.id}>
                <div className="relative pb-8">
                  {index !== statuses.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  ) : null}
                  
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        status.id === currentStatusId 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-400 text-white'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {status.get_phase_display} • {status.created_by_details?.username}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(status.status_date), 'MMM d, yyyy')}
                        </p>
                        {status.is_baseline && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                            Baseline
                          </span>
                        )}
                        {status.is_final && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1 ml-1">
                            Final
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <Link 
                          to={`/projects/${projectId}/status/${status.id}`} 
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StatusTimeline;