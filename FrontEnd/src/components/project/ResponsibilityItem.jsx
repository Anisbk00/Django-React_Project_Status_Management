import { useState, useMemo, useEffect } from 'react';
import StatusBadge from '../ui/StatusBadge';
import StatusSelector from '../ui/StatusSelector';
import UserSelector from '../ui/UserSelector';
import ProgressBar from '../ui/ProgressBar';
import Alert from '../ui/Alert';
import { updateResponsibility } from '../../api/responsibilities';

const ResponsibilityItem = ({ responsibility, onChange, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState(() => normalizeResponsibility(responsibility));
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({ title: '', responsible: '', server: '' });

  useEffect(() => {
    setTempData(normalizeResponsibility(responsibility));
  }, [responsibility]);

  function normalizeResponsibility(r) {
    if (!r) {
      return {
        id: null,
        title: '',
        status: 'G',
        responsible: null,
        deputy: null,
        progress: 0,
        comments: '',
        needs_escalation: false,
      };
    }

    // backend may return either "comments" or "comment" in different places — accept both
    const commentsVal = r.comments ?? r.comment ?? '';

    return {
      id: r.id ?? null,
      title: r.title ?? '',
      status: r.status ?? 'G',
      responsible: r.responsible_details ?? r.responsible ?? null,
      deputy: r.deputy_details ?? r.deputy ?? null,
      progress: r.progress ?? 0,
      comments: commentsVal,
      needs_escalation: !!r.needs_escalation,
    };
  }

  const handleChange = (field, value) => {
    setTempData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!tempData.title || !String(tempData.title).trim()) newErrors.title = 'Title is required';
    if (!tempData.responsible) newErrors.responsible = 'Responsible user is required';
    setErrors((prev) => ({ ...prev, ...newErrors, server: '' }));
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (data) => {
    const extractId = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return val.id ?? null;
      return val;
    };

    return {
      title: String(data.title).trim(),
      status: data.status || 'G',
      responsible: extractId(data.responsible),
      deputy: extractId(data.deputy),
      progress: Number(data.progress) || 0,
      // backend expects "comments"
      comments: String(data.comments || '').trim(),
      needs_escalation: !!data.needs_escalation,
    };
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!tempData.id) {
      setErrors((prev) => ({ ...prev, server: 'Cannot save: missing responsibility id.' }));
      return;
    }

    setIsSaving(true);
    setErrors((prev) => ({ ...prev, server: '' }));

    try {
      const payload = buildPayload(tempData);
      const updated = await updateResponsibility(tempData.id, payload);

      setTempData(normalizeResponsibility(updated));
      if (typeof onChange === 'function') {
        try {
          onChange(updated);
        } catch (e) {
          console.warn('onChange handler threw:', e);
        }
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update responsibility:', err);
      const serverMessage = err?.response?.data ?? err?.message ?? 'Update failed';
      if (typeof serverMessage === 'object') {
        const firstKey = Object.keys(serverMessage)[0];
        const firstVal = serverMessage[firstKey];
        const nice = Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal);
        setErrors((prev) => ({ ...prev, [firstKey]: nice, server: nice }));
      } else {
        setErrors((prev) => ({ ...prev, server: String(serverMessage) }));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempData(normalizeResponsibility(responsibility));
    setErrors({ title: '', responsible: '', server: '' });
    setIsEditing(false);
  };

  // Permission: Admin, Project Manager (PM), Responsible (RESP), Deputy (DEP) can edit,
  // and the actual responsible/deputy user can edit too.
  const canEdit = useMemo(() => {
    if (!currentUser) return false;

    const responsibleId = responsibility?.responsible_details?.id ?? responsibility?.responsible ?? null;
    const deputyId = responsibility?.deputy_details?.id ?? responsibility?.deputy ?? null;

    const allowedRoles = ['ADMIN', 'PM', 'RESP', 'DEP'];
    return (
      (currentUser?.id && (currentUser.id === responsibleId || currentUser.id === deputyId)) ||
      allowedRoles.includes(currentUser?.role)
    );
  }, [currentUser, responsibility?.responsible_details?.id, responsibility?.responsible, responsibility?.deputy_details?.id, responsibility?.deputy]);

  return (
    <div className="p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
      {isEditing ? (
        canEdit ? (
          <div className="space-y-5">
            {errors.server && <Alert type="error">{errors.server}</Alert>}

            {/* Title & Status */}
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
              <div className="flex-1">
                <input
                  aria-label="Responsibility title"
                  type="text"
                  value={tempData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Responsibility title"
                  className={`w-full px-4 py-2 border rounded-md shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    text-lg text-gray-800 transition ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <StatusSelector
                  value={tempData.status}
                  onChange={(value) => handleChange('status', value)}
                  className="mt-3 md:mt-0"
                />
              </div>
            </div>
            {/* Responsible & Deputy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Responsible</label>
                <UserSelector
                  value={tempData.responsible}
                  onChange={(value) => handleChange('responsible', value)}
                  placeholder="Select responsible user"
                  className={errors.responsible ? 'border-red-500 text-gray-800' : 'text-gray-800'}
                />
                {errors.responsible && <p className="text-red-500 text-xs mt-1">{errors.responsible}</p>}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Deputy</label>
                <UserSelector
                  value={tempData.deputy}
                  onChange={(value) => handleChange('deputy', value)}
                  allowClear
                  placeholder="Select deputy (optional)"
                  className="text-gray-800"
                />
              </div>
            </div>

            {/* Progress */}
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
              <div className="text-right text-sm text-gray-600 font-mono">{tempData.progress}%</div>
            </div>

            {/* Comments */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Comments</label>
              <textarea
                value={tempData.comments || ''}
                onChange={(e) => handleChange('comments', e.target.value)}
                rows={3}
                placeholder="Additional notes or comments"
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y transition text-gray-800"
              />
            </div>

            {/* Escalation & Actions */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center space-x-2 cursor-pointer">
                <input
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
                  className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !tempData.title?.trim() || !tempData.responsible}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-500 text-sm">
            You do not have permission to edit this responsibility.
            <button onClick={handleCancel} className="ml-2 underline text-blue-600">Close</button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{responsibility?.title}</h3>
            <div className="flex items-center space-x-3">
              <StatusBadge status={responsibility?.status} />
              {responsibility?.needs_escalation && (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  Escalated
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-700">Responsible:</span>{' '}
              {responsibility?.responsible_details?.first_name ? (
                <span className="text-gray-800">
                  {responsibility.responsible_details.first_name} {responsibility.responsible_details.last_name}
                </span>
              ) : responsibility?.responsible ? (
                <span className="text-gray-700">{String(responsibility.responsible)}</span>
              ) : (
                <span className="text-red-500 ml-1">Not assigned</span>
              )}
            </div>

            <div>
              <span className="font-semibold text-gray-700">Deputy:</span>{' '}
              {responsibility?.deputy_details ? (
                <span className="text-gray-800">
                  {responsibility.deputy_details.full_name ||
                    `${responsibility.deputy_details.first_name || ''} ${responsibility.deputy_details.last_name || ''}`.trim()}
                </span>
              ) : (
                <span className="text-gray-400 ml-1 italic">None</span>
              )}
            </div>
          </div>

          {/* ProgressBar + numeric percent */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ProgressBar value={responsibility?.progress ?? 0} />
            </div>
          </div>

          {responsibility?.comments && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 whitespace-pre-line">{responsibility.comments}</p>
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 focus:underline"
            >
              Edit Responsibility
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsibilityItem;
