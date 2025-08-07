/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/outline';
import { triggerEscalation, resolveEscalation } from '../../api/escalations';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const EscalationPanel = ({ responsibilities, projectId, statusId }) => {
  const [activeEscalation, setActiveEscalation] = useState(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Find escalated responsibilities
  const escalatedResponsibilities = responsibilities.filter(
    resp => resp.needs_escalation || resp.status === 'Y' || resp.status === 'R'
  );

  const handleTriggerEscalation = async () => {
    if (!escalationReason.trim()) {
      setError('Please provide a reason for escalation');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Trigger escalation for each escalated responsibility
      for (const resp of escalatedResponsibilities) {
        await triggerEscalation({
          responsibility: resp.id,
          reason: escalationReason
        });
      }
      
      setSuccess('Escalation triggered successfully! Notifications sent to all responsible parties.');
      setEscalationReason('');
    } catch (err) {
      setError('Failed to trigger escalation. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveEscalation = async () => {
    if (!activeEscalation) return;

    try {
      setIsLoading(true);
      setError(null);
      await resolveEscalation(activeEscalation.id);
      setSuccess('Escalation resolved successfully!');
      setActiveEscalation(null);
    } catch (err) {
      setError('Failed to resolve escalation. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Escalation Management</h2>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        
        {escalatedResponsibilities.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">
                Escalated Responsibilities
              </h3>
              <ul className="space-y-2">
                {escalatedResponsibilities.map(resp => (
                  <li key={resp.id} className="flex items-center">
                    <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                    <span className="text-sm text-gray-700">{resp.title}</span>
                    {resp.status === 'Y' && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                        Yellow Status
                      </span>
                    )}
                    {resp.status === 'R' && (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">
                        Red Status
                      </span>
                    )}
                    {resp.needs_escalation && (
                      <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">
                        Manual Escalation
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <label htmlFor="escalation-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Escalation Reason
              </label>
              <textarea
                id="escalation-reason"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why escalation is needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                onClick={handleTriggerEscalation}
                disabled={isLoading || !escalationReason.trim()}
                variant="danger"
              >
                {isLoading ? 'Triggering...' : 'Trigger Escalation'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
            <p className="mt-2 text-gray-600">No escalated responsibilities</p>
            <p className="text-sm text-gray-500 mt-1">
              All responsibilities are on track with no issues requiring escalation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscalationPanel;