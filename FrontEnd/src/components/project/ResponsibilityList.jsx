/* eslint-disable no-unused-vars */
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ResponsibilityItem from './ResponsibilityItem';
import { createResponsibility } from '../../api/responsibilities';
import { fetchUsers } from '../../api/users';

const ResponsibilityList = ({
  responsibilities = [],
  onResponsibilityChange,
  currentUser,
  statusId,
  onResponsibilityCreated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('G');
  const [responsible, setResponsible] = useState(currentUser?.id || '');
  const [deputy, setDeputy] = useState('');
  const [progress, setProgress] = useState(0);
  const [needsEscalation, setNeedsEscalation] = useState(false);
  const [comment, setComment] = useState('');

  // Users dropdown
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isModalOpen) {
      fetchUsers()
        .then(setUsers)
        .catch((err) => console.error('Failed to load users', err));
    }
  }, [isModalOpen]);

  const resetForm = () => {
    setTitle('');
    setStatus('G');
    setResponsible(currentUser?.id || '');
    setDeputy('');
    setProgress(0);
    setNeedsEscalation(false);
    setComment('');
  };

  // Role-based permissions
  const canCreate = () => {
    // Only Responsible, Deputy, or Project Manager can create
    return ['RESP', 'DEP', 'PM'].includes(currentUser?.role);
  };

  const canEdit = (responsibility) => {
    const userId = currentUser?.id;
    const responsibleId = responsibility?.responsible;
    const deputyId = responsibility?.deputy;
    return (
      ['RESP', 'DEP', 'PM'].includes(currentUser?.role) ||
      userId === responsibleId ||
      userId === deputyId
    );
  };

  const handleCreateResponsibility = async () => {
    setErrorMessage('');

    if (!canCreate()) {
      setErrorMessage('You do not have permission to create a responsibility.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }

    const project_status = statusId || (responsibilities[0] && responsibilities[0].project_status);
    if (!project_status) {
      setErrorMessage('No project status found. Please create one first.');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        project_status,
        title: title.trim(),
        responsible: responsible || null,
        deputy: deputy || null,
        status,
        progress: Number(progress) || 0,
        needs_escalation: needsEscalation,
        comment: comment.trim() || ''
      };

      const created = await createResponsibility(payload);

      if (typeof onResponsibilityCreated === 'function') await onResponsibilityCreated(created);
      if (typeof onResponsibilityChange === 'function') onResponsibilityChange(created);

      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create responsibility', err);
      setErrorMessage('Failed to create responsibility. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Responsibilities</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!canCreate()}
          className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
            canCreate()
              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Responsibility
        </button>
      </div>

      {/* Responsibilities list */}
      {responsibilities.length === 0 ? (
        <div className="p-6 text-center text-gray-500 italic select-none">
          No responsibilities found. Click "Add Responsibility" to create one.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {responsibilities.map((responsibility) => (
            <ResponsibilityItem
              key={responsibility.id}
              responsibility={responsibility}
              onChange={onResponsibilityChange}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                {/* Title bar */}
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Add Responsibility
                  </Dialog.Title>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </button>
                </div>

                {/* Error */}
                {errorMessage && (
                  <div className="mb-3 p-2 text-sm bg-red-50 text-red-600 rounded">{errorMessage}</div>
                )}

                {/* Form */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter responsibility title"
                    />
                  </div>

                  {/* Status Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status Color</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded p-2 bg-white text-gray-900"
                    >
                      <option value="G">🟢 Green</option>
                      <option value="Y">🟡 Yellow</option>
                      <option value="R">🔴 Red</option>
                    </select>
                  </div>

                  {/* Responsible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsible</label>
                    <select
                      value={responsible}
                      onChange={(e) => setResponsible(e.target.value)}
                      className="w-full border rounded p-2 bg-white text-gray-900"
                    >
                      <option value="">-- Select Responsible --</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deputy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deputy</label>
                    <select
                      value={deputy}
                      onChange={(e) => setDeputy(e.target.value)}
                      className="w-full border rounded p-2 bg-white text-gray-900"
                    >
                      <option value="">-- Select Deputy --</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Progress */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                    <input
                      type="number"
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full border rounded p-2 bg-white text-gray-900"
                      placeholder="0"
                    />
                  </div>

                  {/* Needs Escalation */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="needsEscalation"
                      checked={needsEscalation}
                      onChange={(e) => setNeedsEscalation(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="needsEscalation" className="text-sm text-gray-700">
                      Needs Escalation
                    </label>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border rounded p-2 bg-white text-gray-900"
                      placeholder="Add a comment..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateResponsibility}
                    disabled={isCreating || !canCreate()}
                    className={`px-4 py-2 text-sm rounded-md text-white ${
                      isCreating || !canCreate()
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ResponsibilityList;
