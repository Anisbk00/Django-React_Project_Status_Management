import { Link } from 'react-router-dom';
import { format } from 'date-fns';

// Helper to map phase codes to readable labels
const phaseLabels = {
  PLAN: 'Planning',
  DEV: 'Development',
  TEST: 'Testing',
  PROD: 'Serial Production',
  COMP: 'Completed',
};

const StatusTimeline = ({ statuses = [], currentStatusId, projectId }) => {
  if (statuses.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Status History</h2>
      </div>

      <div className="p-6">
        <ul className="-mb-8">
          {statuses.map((status, index) => {
            const isCurrent = status.id === currentStatusId;
            const phaseLabel = phaseLabels[status.phase] ?? status.phase;

            return (
              <li key={status.id} aria-current={isCurrent ? 'step' : undefined}>
                <div className="relative pb-8 group hover:bg-gray-50 rounded-md transition-colors">
                  {index !== statuses.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex space-x-3">
                    <div>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white text-sm font-semibold ${
                          isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white group-hover:bg-gray-500 transition-colors'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {phaseLabel} • {status.created_by_details?.username ?? 'Unknown'}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(status.status_date), 'MMM d, yyyy')}
                        </p>
                        <div className="mt-1 space-x-1">
                          {status.is_baseline && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Baseline
                            </span>
                          )}
                          {status.is_final && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Final
                            </span>
                          )}
                        </div>
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
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default StatusTimeline;
