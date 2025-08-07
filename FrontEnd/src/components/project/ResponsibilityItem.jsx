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
    setTempData({
      ...tempData,
      [field]: value
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedResponsibility = await updateResponsibility(tempData.id, tempData);
      onChange(updatedResponsibility);
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
    <div className="p-4 hover:bg-gray-50">
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={tempData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
            />
            <StatusSelector 
              value={tempData.status}
              onChange={(value) => handleChange('status', value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsible
              </label>
              <UserSelector 
                value={tempData.responsible}
                onChange={(value) => handleChange('responsible', value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deputy
              </label>
              <UserSelector 
                value={tempData.deputy}
                onChange={(value) => handleChange('deputy', value)}
                allowClear
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Progress
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={tempData.progress}
              onChange={(e) => handleChange('progress', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-right text-sm text-gray-600">{tempData.progress}%</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments
            </label>
            <textarea
              value={tempData.comments || ''}
              onChange={(e) => handleChange('comments', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id={`escalation-${responsibility.id}`}
                type="checkbox"
                checked={tempData.needs_escalation}
                onChange={(e) => handleChange('needs_escalation', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`escalation-${responsibility.id}`} className="ml-2 block text-sm text-gray-900">
                Needs Escalation
              </label>
            </div>
            
            <div className="space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">{responsibility.title}</h3>
            <div className="flex items-center">
              <StatusBadge status={responsibility.status} />
              {responsibility.needs_escalation && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Escalated
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4">
            <div>
              <span className="font-medium">Responsible:</span> 
              {responsibility.responsible_details ? (
                <span> {responsibility.responsible_details.first_name} {responsibility.responsible_details.last_name}</span>
              ) : (
                <span className="text-red-500 ml-1">Not assigned</span>
              )}
            </div>
            
            <div>
              <span className="font-medium">Deputy:</span> 
              {responsibility.deputy_details ? (
                <span> {responsibility.deputy_details.first_name} {responsibility.deputy_details.last_name}</span>
              ) : (
                <span className="text-gray-400 ml-1">None</span>
              )}
            </div>
          </div>
          
          <ProgressBar value={responsibility.progress} />
          
          {responsibility.comments && (
            <div className="bg-gray-50 rounded-lg p-3 mt-2">
              <p className="text-sm text-gray-700">{responsibility.comments}</p>
            </div>
          )}
          
          {(currentUser.id === responsibility.responsible || 
            currentUser.id === responsibility.deputy) && (
            <div className="mt-3">
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
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