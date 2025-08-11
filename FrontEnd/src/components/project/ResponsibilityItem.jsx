import { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';
import StatusSelector from '../ui/StatusSelector';
import UserSelector from '../ui/UserSelector';
import ProgressBar from '../ui/ProgressBar';
import { updateResponsibility } from '../../api/responsibilities';

const ResponsibilityItem = ({ responsibility, onChange, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState(responsibility);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateResponsibility(tempData.id, tempData);
      onChange(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update responsibility:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempData(responsibility);
    setIsEditing(false);
  };

  return (
    <div className="p-4 rounded-lg hover:bg-gray-50 transition-colors">
      {isEditing ? (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <input
              type="text"
              value={tempData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                text-lg font-semibold transition"
              placeholder="Responsibility title"
            />
            <StatusSelector
              value={tempData.status}
              onChange={(value) => handleChange('status', value)}
              className="mt-3 md:mt-0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Responsible</label>
              <UserSelector
                value={tempData.responsible}
                onChange={(value) => handleChange('responsible', value)}
                placeholder="Select responsible user"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Deputy</label>
              <UserSelector
                value={tempData.deputy}
                onChange={(value) => handleChange('deputy', value)}
                allowClear
                placeholder="Select deputy (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Progress</label>
            <input
              type="range"
              min="0"
              max="100"
              value={tempData.progress}
              onChange={(e) => handleChange('progress', Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-right text-sm text-gray-600 font-mono tabular-nums mt-1">
              {tempData.progress}%
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Comments</label>
            <textarea
              value={tempData.comments || ''}
              onChange={(e) => handleChange('comments', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                resize-y transition"
              placeholder="Additional notes or comments"
            />
          </div>

          <div className="flex items-center justify-between">
            <label
              htmlFor={`escalation-${responsibility.id}`}
              className="inline-flex items-center space-x-2 cursor-pointer select-none"
            >
              <input
                id={`escalation-${responsibility.id}`}
                type="checkbox"
                checked={tempData.needs_escalation}
                onChange={(e) => handleChange('needs_escalation', e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Needs Escalation</span>
            </label>

            <div className="space-x-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-5 py-2 border border-gray-300 rounded-md text-gray-700
                  bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold
                  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSaving ? (
                  <svg
                    className="animate-spin h-5 w-5 mx-auto text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="Saving"
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
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{responsibility.title}</h3>
            <div className="flex items-center space-x-3">
              <StatusBadge status={responsibility.status} />
              {responsibility.needs_escalation && (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 select-none">
                  Escalated
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Responsible:</span>{' '}
              {responsibility.responsible_details ? (
                <span>{responsibility.responsible_details.first_name} {responsibility.responsible_details.last_name}</span>
              ) : (
                <span className="text-red-500 ml-1">Not assigned</span>
              )}
            </div>

            <div>
              <span className="font-semibold">Deputy:</span>{' '}
              {responsibility.deputy_details ? (
                <span>{responsibility.deputy_details.first_name} {responsibility.deputy_details.last_name}</span>
              ) : (
                <span className="text-gray-400 ml-1 italic">None</span>
              )}
            </div>
          </div>

          <ProgressBar value={responsibility.progress} />

          {responsibility.comments && (
            <div className="bg-gray-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-gray-700 whitespace-pre-line">{responsibility.comments}</p>
            </div>
          )}

          {(currentUser.id === responsibility.responsible || currentUser.id === responsibility.deputy) && (
            <div className="mt-4">
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
              >
                Edit Responsibility
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsibilityItem;
