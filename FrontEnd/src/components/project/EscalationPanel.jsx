/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { triggerEscalation, resolveEscalation, fetchEscalations } from '../../api/escalations';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const EscalationPanel = ({
  responsibilities = [],
  projectId,
  currentUser,
}) => {
  const [escalations, setEscalations] = useState([]);
  const [escalationReason, setEscalationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canSeeEscalations = ['EM', 'ADMIN'].includes(currentUser?.role);

  useEffect(() => {
    if (!projectId || !canSeeEscalations) return;

    const loadEscalations = async () => {
      try {
        const data = await fetchEscalations({ project: projectId });
        setEscalations(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadEscalations();
  }, [projectId, currentUser, canSeeEscalations]);

  const escalatedResponsibilities = Array.isArray(responsibilities)
    ? responsibilities.filter(
        r => r.needs_escalation || r.status === 'Y' || r.status === 'R'
      )
    : [];

  const handleTriggerEscalation = async () => {
    if (!escalationReason.trim()) {
      setError('Please provide a reason for escalation.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await Promise.all(
        escalatedResponsibilities.map(resp =>
          triggerEscalation({ responsibility: resp.id, reason: escalationReason })
        )
      );
      setSuccess('Escalation triggered successfully!');
      setEscalationReason('');
      const updated = await fetchEscalations({ project: projectId });
      setEscalations(updated);
    } catch (err) {
      console.error(err);
      setError('Failed to trigger escalation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveEscalation = async (id) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await resolveEscalation(id);
      setSuccess('Escalation resolved successfully!');
      const updated = await fetchEscalations({ project: projectId });
      setEscalations(updated);
    } catch (err) {
      console.error(err);
      setError('Failed to resolve escalation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
        <h2 className="text-lg font-medium text-gray-800">Escalation Management</h2>
      </div>

      <div className="p-6 space-y-6">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Open Escalations */}
        {canSeeEscalations && escalations.filter(e => !e.resolved).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-700">Open Escalations</h3>
            <div className="space-y-2">
              {escalations.filter(e => !e.resolved).map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2 text-sm hover:shadow-sm transition text-gray-800"
                >
                  <span>
                    <strong className="text-gray-900">{e.responsibility_title}</strong> — {e.reason}
                  </span>
                  <button
                    onClick={() => handleResolveEscalation(e.id)}
                    disabled={isLoading}
                    className="px-3 py-1 text-gray-800 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Trigger */}
        {escalatedResponsibilities.length > 0 ? (
          <div className="space-y-4 mt-4">
            <h3 className="text-md font-medium text-gray-700">Escalated Responsibilities</h3>
            <ul className="space-y-2">
              {escalatedResponsibilities.map(resp => (
                <li key={resp.id} className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: resp.status === 'R' ? '#f87171' : resp.status === 'Y' ? '#facc15' : resp.needs_escalation ? '#c084fc' : '#9ca3af' }} />
                  <span className="text-gray-800 text-sm">{resp.title}</span>
                  {resp.status && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      resp.status === 'Y' ? 'bg-yellow-100 text-yellow-800' :
                      resp.status === 'R' ? 'bg-red-100 text-red-800' :
                      resp.needs_escalation ? 'bg-purple-100 text-purple-800' : ''
                    }`}>
                      {resp.status === 'Y' ? 'Yellow' : resp.status === 'R' ? 'Red' : resp.needs_escalation ? 'Manual' : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div>
              <label htmlFor="escalation-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Escalation Reason
              </label>
              <textarea
                id="escalation-reason"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why escalation is needed..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTriggerEscalation}
                disabled={isLoading || !escalationReason.trim()}
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Triggering...' : 'Trigger Escalation'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
            <p className="mt-2 text-gray-700">No escalated responsibilities</p>
            <p className="text-sm text-gray-500 mt-1">All responsibilities are on track.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscalationPanel;
