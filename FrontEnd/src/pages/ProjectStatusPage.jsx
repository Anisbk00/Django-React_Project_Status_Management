import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/solid';
import ProjectHeader from '../components/project/ProjectHeader';
import ResponsibilityList from '../components/project/ResponsibilityList';
import StatusSavePanel from '../components/project/StatusSavePanel';
import EscalationPanel from '../components/project/EscalationPanel';
import StatusTimeline from '../components/project/StatusTimeline';
import { fetchProjectDetails, fetchProjectStatuses, fetchLatestStatus } from '../api/projects';
import { saveStatus, createStatus } from '../api/status';
import { createResponsibility } from '../api/responsibilities';
import { fetchUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/ui/Loader';
import Alert from '../components/ui/Alert';

/**
 * ProjectStatusPage — fully updated with accessibility fixes & modern UI
 */
const ProjectStatusPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [status, setStatus] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [modalMounted, setModalMounted] = useState(false);
  const [modalActive, setModalActive] = useState(false);

  const [newStatusDate, setNewStatusDate] = useState('');
  const [newPhase, setNewPhase] = useState('PLAN');
  const [newNotes, setNewNotes] = useState('');
  const [newIsBaseline, setNewIsBaseline] = useState(false);
  const [newIsFinal, setNewIsFinal] = useState(false);
  const [newResponsibilities, setNewResponsibilities] = useState([]);
  const [createErrors, setCreateErrors] = useState({});
  const [responsibilityErrors, setResponsibilityErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [users, setUsers] = useState([]);
  const usersLoadedRef = useRef(false);

  const createBtnRef = useRef(null);
  const firstInputRef = useRef(null);
  const modalRef = useRef(null);

  const isAdminOrPM = user?.role === 'PM' || user?.role === 'ADMIN';

  // --- Load project & status data ---
  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectData, statusData, statusesData] = await Promise.all([
        fetchProjectDetails(projectId),
        fetchLatestStatus(projectId),
        fetchProjectStatuses(projectId)
      ]);
      setProject(projectData);
      setStatus(statusData);
      setStatuses(statusesData);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
    return () => resetCreateModalImmediate();
  }, [projectId]);

  // Load users once
  useEffect(() => {
    if (usersLoadedRef.current) return;
    let mounted = true;
    const load = async () => {
      try {
        const u = await fetchUsers();
        if (!mounted) return;
        setUsers(u || []);
        usersLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load users', err);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Focus first input when modal opens
  useEffect(() => {
    if (modalActive) {
      const t = setTimeout(() => {
        if (firstInputRef.current?.focus) firstInputRef.current.focus();
        else if (modalRef.current) modalRef.current.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [modalActive]);

  // Restore focus to create button when modal closes
  useEffect(() => {
    if (!modalMounted && createBtnRef.current) {
      setTimeout(() => createBtnRef.current.focus(), 50);
    }
  }, [modalMounted]);

  // --- Handlers ---
  const handleSaveStatus = async (saveType) => {
    if (!status) return;
    try {
      setIsSaving(true);
      const updatedStatus = {
        ...status,
        is_baseline: saveType === 'baseline' || status.is_baseline,
        is_final: saveType === 'final' || status.is_final,
      };
      const savedStatus = await saveStatus(updatedStatus.id, updatedStatus);
      setStatus(savedStatus);
      setStatuses(prev => prev.map(s => (s.id === savedStatus.id ? savedStatus : s)));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save project status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResponsibilityChange = (updatedResponsibility) => {
    if (!status) return;
    setStatus(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.map(resp =>
        resp.id === updatedResponsibility.id ? updatedResponsibility : resp
      ),
    }));
  };

  const handleResponsibilityCreated = async () => {
    try {
      const [statusData, statusesData] = await Promise.all([
        fetchLatestStatus(projectId),
        fetchProjectStatuses(projectId)
      ]);
      setStatus(statusData);
      setStatuses(statusesData);
    } catch (err) {
      console.error(err);
    }
  };

  const resetCreateModalImmediate = () => {
    setModalMounted(false);
    setModalActive(false);
    setNewStatusDate('');
    setNewPhase('PLAN');
    setNewNotes('');
    setNewIsBaseline(false);
    setNewIsFinal(false);
    setNewResponsibilities([]);
    setCreateErrors({});
    setResponsibilityErrors({});
    setCreating(false);
  };

  const openModal = () => {
    setModalMounted(true);
    requestAnimationFrame(() => setModalActive(true));
  };

  const closeModal = () => {
    setModalActive(false);
    setTimeout(() => setModalMounted(false), 240);
  };
  const allResponsibilities = statuses.flatMap(s => s.responsibilities || []);

  // --- Create-status modal helpers ---
  const updateNewResponsibility = (idx, field, value) => {
    setNewResponsibilities(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setResponsibilityErrors(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: undefined } }));
  };
  const removeNewResponsibility = (idx) => {
    setNewResponsibilities(prev => prev.filter((_, i) => i !== idx));
    setResponsibilityErrors(prev => { const copy = { ...prev }; delete copy[idx]; return copy; });
  };
  const validateResponsibilities = () => {
    const errs = {};
    newResponsibilities.forEach((r, idx) => {
      if (!r.title?.trim()) errs[idx] = { ...errs[idx], title: 'Title is required' };
    });
    setResponsibilityErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitCreateStatus = async () => {
    setCreateErrors({});
    setCreating(true);

    if (!projectId) { setCreateErrors({ general: 'Project ID missing.' }); setCreating(false); return; }
    if (!newPhase) { setCreateErrors({ phase: 'Phase required' }); setCreating(false); return; }
    if (!validateResponsibilities()) { setCreateErrors({ general: 'Fix highlighted responsibility errors.' }); setCreating(false); return; }

    try {
      const payload = {
        status_date: newStatusDate || new Date().toISOString().slice(0, 10),
        phase: newPhase,
        notes: newNotes || '',
        is_baseline: Boolean(newIsBaseline),
        is_final: Boolean(newIsFinal),
      };

      const created = await createStatus(payload, projectId);

      for (const r of newResponsibilities) {
        if (!r.title?.trim()) continue;
        await createResponsibility({ project_status: created.id, title: r.title.trim(), responsible: r.responsible || null });
      }

      await loadProjectData();
      closeModal();
    } catch (err) {
      console.error('Create status failed', err);
      const backend = err?.response?.data;
      setCreateErrors(backend && typeof backend === 'object' ? backend : { general: err?.message || 'Failed to create status' });
    } finally { setCreating(false); }
  };

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} actionLabel="Retry" onAction={loadProjectData} />;
  if (!project) return <Alert type="info" message="Project not found" />;

  return (
    <>
      {/* Background content */}
      <div inert={modalActive ? true : undefined} className="space-y-6">
        <ProjectHeader project={project} status={status} onBack={() => navigate('/dashboard')} />

        <div className="flex items-center justify-between">
          <div />
          {isAdminOrPM && (
            <div className="flex items-center space-x-2">
              <button
                ref={createBtnRef}
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-200 to-blue-200 text-teal-900 font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Create New Status"
              >
                <PlusIcon className="h-5 w-5 text-teal-800" />
                <span>Create New Status</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <ResponsibilityList
              projectId={projectId} 
              responsibilities={allResponsibilities}
              onResponsibilityChange={handleResponsibilityChange}
              onResponsibilityCreated={handleResponsibilityCreated}
              currentUser={user}
            />

            <StatusSavePanel
              onSave={handleSaveStatus}
              isSaving={isSaving}
              isBaseline={status?.is_baseline}
              isFinal={status?.is_final}
            />
          </div>

          <div className="space-y-6">
            <EscalationPanel responsibilities={status?.responsibilities || []} projectId={projectId} statusId={status?.id} currentUser={user} />
            <StatusTimeline statuses={statuses} currentStatusId={status?.id} projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className={`fixed inset-0 bg-black transition-opacity duration-200 ${modalActive ? 'opacity-40' : 'opacity-0'}`} onClick={closeModal} />
          <div
            ref={modalRef}
            className={`relative w-full max-w-2xl bg-white rounded-lg shadow-xl p-6 transform transition-all duration-200 ${modalActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Create Project Status"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Create Project Status</h3>
              <button onClick={closeModal} className="text-gray-500">Close</button>
            </div>

            <div className="mt-4 space-y-4">
              {createErrors.general && <div className="text-sm text-red-600">{createErrors.general}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700">Status date</label>
                <input
                  ref={firstInputRef}
                  type="date"
                  value={newStatusDate}
                  onChange={(e) => setNewStatusDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-gray-800"
                />
                {createErrors.status_date && <p className="mt-1 text-sm text-red-600">{createErrors.status_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phase</label>
                <select
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value)}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-gray-800"
                >
                  <option value="PLAN">Planning</option>
                  <option value="DEV">Development</option>
                  <option value="TEST">Testing</option>
                  <option value="PROD">Serial Production</option>
                  <option value="COMP">Completed</option>
                </select>
                {createErrors.phase && <p className="mt-1 text-sm text-red-600">{createErrors.phase}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} className="w-full mt-1 rounded-md border px-3 py-2 text-gray-800" />
              </div>

              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input type="checkbox" checked={newIsBaseline} onChange={(e) => setNewIsBaseline(e.target.checked)} className="form-checkbox" />
                  <span className="ml-2 text-gray-700">Baseline</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="checkbox" checked={newIsFinal} onChange={(e) => setNewIsFinal(e.target.checked)} className="form-checkbox" />
                  <span className="ml-2 text-gray-700">Final</span>
                </label>
              </div>

              <div>


                <div className="mt-2 space-y-2">
                  {newResponsibilities.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <input
                          value={r.title}
                          onChange={(e) => updateNewResponsibility(idx, 'title', e.target.value)}
                          placeholder="Responsibility title"
                          className={`w-full rounded-md border px-2 py-2 text-gray-800 ${responsibilityErrors[idx]?.title ? 'border-red-600' : ''}`}
                        />
                        {responsibilityErrors[idx]?.title && <p className="mt-1 text-xs text-red-600">{responsibilityErrors[idx].title}</p>}
                      </div>
                      <div className="col-span-3">
                        <UserPicker users={users} value={r.responsible} onChange={(val) => updateNewResponsibility(idx, 'responsible', val)} />
                      </div>
                      <div className="col-span-2">
                        <button onClick={() => removeNewResponsibility(idx)} className="text-sm text-red-600">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={closeModal} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={submitCreateStatus}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-200 to-cyan-200 text-teal-900 font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4 text-teal-800" />
                  {creating ? 'Creating...' : 'Create Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Simple UserPicker
 */
const UserPicker = ({ users = [], value, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => String(u.id) === String(value));
  const display = selectedUser ? (selectedUser.full_name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username) : query;

  const filtered = users.filter(u => {
    const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
    return name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={display}
        placeholder="Select user"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border px-2 py-1 text-gray-800"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow max-h-36 overflow-auto mt-1 text-sm">
          {filtered.map(u => {
            const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
            return (
              <li key={u.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={() => { onChange(u.id); setOpen(false); setQuery(''); }}>
                {name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProjectStatusPage;
