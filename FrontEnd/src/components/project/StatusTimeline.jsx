/* eslint-disable no-unused-vars */
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import ResponsibilityItem from '../project/ResponsibilityItem'; // adjust path if needed

const phaseLabels = {
  PLAN: 'Planning',
  DEV: 'Development',
  TEST: 'Testing',
  PROD: 'Serial Production',
  COMP: 'Completed',
};

const StatusTimeline = ({ statuses = [], currentStatusId, projectId, currentUser }) => {
  const [animatedStatuses, setAnimatedStatuses] = useState([]);

  useEffect(() => {
    const timeouts = [];
    setAnimatedStatuses([]);
    statuses.forEach((status, index) => {
      const timeout = setTimeout(() => {
        setAnimatedStatuses((prev) => [...prev, status]);
      }, index * 100);
      timeouts.push(timeout);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [statuses]);

  if (!statuses.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Status History</h2>
      </div>

      <div className="p-6">
        <ul className="relative border-l border-gray-200">
          {animatedStatuses.map((status, index) => {
            const isCurrent = status.id === currentStatusId;
            const phaseLabel = phaseLabels[status.phase] ?? status.phase;

            return (
              <li
                key={status.id}
                className={`mb-8 last:mb-0 relative transition-all duration-500 ease-out transform ${
                  isCurrent ? 'scale-105 opacity-100' : 'opacity-100'
                }`}
              >
                {index !== animatedStatuses.length - 1 && (
                  <span
                    className="absolute top-8 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div
                  className={`relative flex items-start space-x-3 p-3 rounded-md transition-colors duration-300 ${
                    isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white text-sm font-semibold transition-colors duration-300 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-400 text-white group-hover:bg-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500">
                      {phaseLabel} • {status.created_by_details?.username ?? 'Unknown'}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {status.status_date
                        ? format(new Date(status.status_date), 'MMM d, yyyy')
                        : '—'}
                    </p>

                    <div className="mt-1 space-x-2">
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

                    {/* Responsibilities under this status */}
                    {status.responsibilities?.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {status.responsibilities.map((r) => (
                          <li key={r.id} className="text-sm text-gray-700">
                            <strong>{r.title}</strong> –{' '}
                            {r.responsible_details?.full_name ||
                              `${r.responsible_details?.first_name || ''} ${r.responsible_details?.last_name || ''}`.trim() ||
                              'Unassigned'}{' '}
                            ({r.status_display || r.status})
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="text-right text-sm mt-2">
                      <Link
                        to={`/projects/${projectId}/status/${status.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
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