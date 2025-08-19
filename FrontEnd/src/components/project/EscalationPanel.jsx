/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { triggerEscalation, resolveEscalation, fetchEscalations } from '../../api/escalations';
import { fetchUsers } from '../../api/users';
import UserSelector from '../ui/UserSelector';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

/**
 * EscalationPanel (improved contrast + proper user selects)
 */
const EscalationPanel = ({
  responsibilities = [],
  projectId,
  currentUser = null,
  users: incomingUsers = null,
}) => {
  const [escalations, setEscalations] = useState([]);
  const [history, setHistory] = useState({ results: [], next: null, previous: null });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('open'); // 'open' | 'resolved' | 'all'
  const [isLoading, setIsLoading] = useState(false);
  const [generalMessage, setGeneralMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // form state
  const [selectedResponsibility, setSelectedResponsibility] = useState(''); // will be id (number/string)
  const [escalationReason, setEscalationReason] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(currentUser?.id || null); // may be object or id
  const [resolved, setResolved] = useState(false);
  const [resolvedAt, setResolvedAt] = useState('');
  const [resolvedBy, setResolvedBy] = useState(currentUser?.id || null); // may be object or id
  const [users, setUsers] = useState(incomingUsers || []);

  const escalatedResponsibilities = Array.isArray(responsibilities)
    ? responsibilities.filter((r) => r.needs_escalation || r.status === 'Y' || r.status === 'R')
    : [];

  const canSeeEscalations = ['EM', 'ADMIN'].includes(currentUser?.role);

  // load users when needed
  useEffect(() => {
    if (incomingUsers) {
      // if incomingUsers provided, keep them
      if (currentUser?.id) {
        setSelectedCreator((prev) => prev || currentUser.id);
        setResolvedBy((prev) => prev || currentUser.id);
      }
      return;
    }

    let mounted = true;
    const loadUsers = async () => {
      try {
        const u = await fetchUsers();
        if (!mounted) return;
        setUsers(Array.isArray(u) ? u : u.results ?? []);
        if (currentUser?.id) {
          setSelectedCreator((prev) => prev || currentUser.id);
          setResolvedBy((prev) => prev || currentUser.id);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    loadUsers();
    return () => {
      mounted = false;
    };
  }, [incomingUsers, currentUser]);

  // load quick open escalations
  useEffect(() => {
    if (!projectId || !canSeeEscalations) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEscalations({ project: projectId, resolved: false });
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data.results ?? [];
        setEscalations(list);
      } catch (err) {
        console.error('Failed to fetch escalations', err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [projectId, canSeeEscalations]);

  // load history (paginated)
  useEffect(() => {
    if (!projectId || !canSeeEscalations) return;
    loadHistory({
      project: projectId,
      resolved: historyFilter === 'resolved' ? true : historyFilter === 'open' ? false : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, historyFilter, canSeeEscalations]);

  const loadHistory = async (params = {}) => {
    setHistoryLoading(true);
    setGeneralMessage(null);
    try {
      const data = await fetchEscalations(params);
      if (Array.isArray(data)) {
        setHistory({ results: data, next: null, previous: null });
      } else {
        setHistory({
          results: data.results ?? [],
          next: data.next ?? null,
          previous: data.previous ?? null,
        });
      }
    } catch (err) {
      console.error('Failed to load escalation history', err);
      setGeneralMessage('Failed to load escalation history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const navigateHistory = async (url) => {
    if (!url) return;
    setHistoryLoading(true);
    setGeneralMessage(null);
    try {
      const data = await fetchEscalations({ url });
      if (Array.isArray(data)) {
        setHistory({ results: data, next: null, previous: null });
      } else {
        setHistory({
          results: data.results ?? [],
          next: data.next ?? null,
          previous: data.previous ?? null,
        });
      }
    } catch (err) {
      console.error('Failed nav history', err);
      setGeneralMessage('Failed to load page.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedResponsibility('');
    setEscalationReason('');
    setSelectedCreator(currentUser?.id || null);
    setResolved(false);
    setResolvedAt('');
    setResolvedBy(currentUser?.id || null);
    setFieldErrors({});
    setGeneralMessage(null);
  };

  const mapBackendErrorsToState = (backendData, respId = null) => {
    if (!backendData) return;
    if (typeof backendData === 'object' && !Array.isArray(backendData)) {
      const next = {};
      for (const key in backendData) {
        const val = backendData[key];
        const message = Array.isArray(val) ? val.join(' ') : String(val);
        if (respId !== null) next[`${respId}:${key}`] = message;
        else next[key] = message;
      }
      setFieldErrors((prev) => ({ ...prev, ...next }));
      const nonField = backendData.non_field_errors || backendData?.detail || backendData.error;
      if (nonField) setGeneralMessage(Array.isArray(nonField) ? nonField.join(' ') : String(nonField));
    } else {
      setGeneralMessage(String(backendData));
    }
  };

  // helper: get id from user object or id
  const idOf = (u) => {
    if (!u) return null;
    if (typeof u === 'object') return u.id ?? u.pk ?? null;
    return u;
  };

  const buildPayload = (respId) => {
    const payload = {
      responsibility: respId,
      reason: escalationReason.trim(),
      created_by: idOf(selectedCreator) || idOf(currentUser),
    };
    if (resolved) {
      payload.resolved = true;
      payload.resolved_at = resolvedAt ? new Date(resolvedAt).toISOString() : new Date().toISOString();
      payload.resolved_by = idOf(resolvedBy) || idOf(selectedCreator) || idOf(currentUser);
    }
    return payload;
  };

  // single escalation
  const handleTriggerEscalation = async () => {
    setFieldErrors({});
    setGeneralMessage(null);

    if (!selectedResponsibility) {
      setFieldErrors({ responsibility: 'Please select a responsibility.' });
      return;
    }
    if (!escalationReason.trim()) {
      setFieldErrors({ reason: 'Please provide a reason.' });
      return;
    }
    if (!idOf(selectedCreator) && !idOf(currentUser)) {
      setFieldErrors({ created_by: 'Please select the creator.' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = buildPayload(selectedResponsibility);
      await triggerEscalation(payload);
      setGeneralMessage('Escalation created.');
      resetForm();

      if (projectId && canSeeEscalations) {
        const openList = await fetchEscalations({ project: projectId, resolved: false });
        setEscalations(Array.isArray(openList) ? openList : openList.results ?? []);
        await loadHistory({
          project: projectId,
          resolved: historyFilter === 'resolved' ? true : historyFilter === 'open' ? false : undefined,
        });
      }
    } catch (err) {
      console.error(err);
      const backend = err?.response?.data;
      if (backend) mapBackendErrorsToState(backend);
      else setGeneralMessage(err?.message || 'Failed to create escalation.');
    } finally {
      setIsLoading(false);
    }
  };

  // bulk escalate
  const handleBulkTrigger = async () => {
    setFieldErrors({});
    setGeneralMessage(null);

    if (escalatedResponsibilities.length === 0) {
      setGeneralMessage('No escalated responsibilities to process.');
      return;
    }
    if (!escalationReason.trim()) {
      setFieldErrors({ reason: 'Please provide a reason for bulk escalation.' });
      return;
    }
    if (!idOf(selectedCreator) && !idOf(currentUser)) {
      setFieldErrors({ created_by: 'Please select the creator.' });
      return;
    }

    setIsLoading(true);
    try {
      const promises = escalatedResponsibilities.map((resp) => {
        const payload = {
          ...buildPayload(resp.id),
          responsibility: resp.id,
        };
        return triggerEscalation(payload)
          .then((r) => ({ status: 'fulfilled', id: resp.id, r }))
          .catch((err) => ({ status: 'rejected', id: resp.id, err }));
      });

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      if (successes.length && failures.length === 0) {
        setGeneralMessage(`${successes.length} escalations created.`);
        resetForm();
      } else {
        setGeneralMessage(`${successes.length} created, ${failures.length} failed.`);
        const aggregated = {};
        failures.forEach((f) => {
          const backend = f.err?.response?.data;
          if (backend && typeof backend === 'object') {
            for (const key in backend) {
              const val = backend[key];
              aggregated[`${f.id}:${key}`] = Array.isArray(val) ? val.join(' ') : String(val);
            }
          } else aggregated[`id_${f.id}`] = f.err?.message || 'Unknown error';
        });
        setFieldErrors((prev) => ({ ...prev, ...aggregated }));
      }

      // refresh
      if (projectId && canSeeEscalations) {
        const openList = await fetchEscalations({ project: projectId, resolved: false });
        setEscalations(Array.isArray(openList) ? openList : openList.results ?? []);
        await loadHistory({
          project: projectId,
          resolved: historyFilter === 'resolved' ? true : historyFilter === 'open' ? false : undefined,
        });
      }
    } catch (err) {
      console.error('Bulk escalate unexpected error', err);
      setGeneralMessage('Bulk escalation failed unexpectedly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveEscalation = async (id) => {
    setIsLoading(true);
    setFieldErrors({});
    setGeneralMessage(null);
    try {
      await resolveEscalation(id);
      setGeneralMessage('Escalation resolved.');
      if (projectId && canSeeEscalations) {
        const openList = await fetchEscalations({ project: projectId, resolved: false });
        setEscalations(Array.isArray(openList) ? openList : openList.results ?? []);
        await loadHistory({
          project: projectId,
          resolved: historyFilter === 'resolved' ? true : historyFilter === 'open' ? false : undefined,
        });
      }
    } catch (err) {
      console.error('Resolve escalation error:', err);
      const backend = err?.response?.data;
      if (backend) mapBackendErrorsToState(backend);
      else setGeneralMessage('Failed to resolve escalation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md text-gray-800">
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
        <h2 className="text-lg font-medium text-gray-800">Escalation Management</h2>
      </div>

      <div className="p-6 space-y-6">
        {generalMessage && <Alert type="info" message={generalMessage} />}

        {/* Quick Open Escalations */}
        {canSeeEscalations && escalations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-800">Open Escalations (Quick)</h3>
            <div className="space-y-2">
              {escalations.map((e) => (
                <div key={e.id} className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2 text-sm hover:shadow-sm transition bg-white">
                  <span className="text-gray-700">
                    <strong className="text-gray-900">{e.responsibility_details?.title ?? e.responsibility}</strong> — <span className="text-gray-700">{e.reason}</span>
                    <div className="text-xs text-gray-500 mt-1">by <span className="text-gray-600">{e.created_by_details?.username ?? e.created_by}</span> • <span className="text-gray-600">{new Date(e.created_at).toLocaleString()}</span></div>
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

        {/* Create / Bulk Form */}
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-800">Create Escalation</h3>
            {escalatedResponsibilities.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkTrigger}
                  disabled={isLoading}
                  className="px-3 py-1 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : `Trigger All Escalated (${escalatedResponsibilities.length})`}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsibility</label>
            <select
              value={selectedResponsibility}
              onChange={(e) => setSelectedResponsibility(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-md text-gray-800 bg-white"
            >
              <option value="">-- Select responsibility --</option>
              {responsibilities.map((r) => (
                <option key={r.id} value={r.id} style={{ color: '#111827' }}>
                  {r.title}{r.status ? ` (${r.status})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.responsibility && <p className="mt-1 text-sm text-red-600">{fieldErrors.responsibility}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} rows="3" className="w-full px-3 py-2 border rounded-md text-gray-800 bg-white" />
            {fieldErrors.reason && <p className="mt-1 text-sm text-red-600">{fieldErrors.reason}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created by</label>
            {/* UserSelector returns user object when possible; we accept object or id */}
            <UserSelector
              value={selectedCreator}
              onChange={(val) => setSelectedCreator(val)}
              allowClear={false}
              placeholder="Select creator"
              className="w-full"
            />
            {fieldErrors.created_by && <p className="mt-1 text-sm text-red-600">{fieldErrors.created_by}</p>}
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} className="form-checkbox" />
              <span className="text-sm text-gray-700">Resolved</span>
            </label>
            {resolved && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resolved at</label>
                  <input type="datetime-local" value={resolvedAt} onChange={(e) => setResolvedAt(e.target.value)} className="w-full px-3 py-2 border rounded-md text-gray-800 bg-white" />
                  {fieldErrors.resolved_at && <p className="mt-1 text-sm text-red-600">{fieldErrors.resolved_at}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Resolved by</label>
                  <UserSelector
                    value={resolvedBy}
                    onChange={(val) => setResolvedBy(val)}
                    allowClear={false}
                    placeholder="Select resolver"
                    className="w-full"
                  />
                  {fieldErrors.resolved_by && <p className="mt-1 text-sm text-red-600">{fieldErrors.resolved_by}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={resetForm} disabled={isLoading} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Reset</button>
            <button onClick={handleTriggerEscalation} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded-md">
              {isLoading ? 'Processing...' : 'Trigger Escalation'}
            </button>
          </div>
        </div>

        {/* History UI */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-800">Escalation History</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => setHistoryFilter('open')} className={`px-3 py-1 rounded ${historyFilter === 'open' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Open</button>
              <button onClick={() => setHistoryFilter('resolved')} className={`px-3 py-1 rounded ${historyFilter === 'resolved' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Resolved</button>
              <button onClick={() => setHistoryFilter('all')} className={`px-3 py-1 rounded ${historyFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>All</button>
            </div>
          </div>

          <div className="mt-3">
            {historyLoading ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : history.results.length === 0 ? (
              <p className="text-sm text-gray-500">No escalation records.</p>
            ) : (
              <div className="space-y-2">
                {history.results.map((h) => (
                  <div key={h.id} className="border rounded-md px-4 py-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{h.responsibility_details?.title || h.responsibility}</div>
                        <div className="text-sm text-gray-700">{h.reason}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created by <span className="text-gray-600">{h.created_by_details?.username || h.created_by}</span> • <span className="text-gray-600">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        {h.resolved && (
                          <div className="text-xs text-gray-500 mt-1">
                            Resolved by <span className="text-gray-600">{h.resolved_by_details?.username || h.resolved_by}</span> • <span className="text-gray-600">{h.resolved_at ? new Date(h.resolved_at).toLocaleString() : '-'}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        {!h.resolved && (
                          <button onClick={() => handleResolveEscalation(h.id)} disabled={isLoading} className="px-3 py-1 bg-gray-200 rounded text-sm text-gray-800">Resolve</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination controls */}
            <div className="mt-3 flex items-center justify-between">
              <div>
                {history.previous ? (
                  <button onClick={() => navigateHistory(history.previous)} className="px-3 py-1 border rounded mr-2 text-gray-700">Prev</button>
                ) : null}
                {history.next ? (
                  <button onClick={() => navigateHistory(history.next)} className="px-3 py-1 border rounded text-gray-700">Next</button>
                ) : null}
              </div>
              <div className="text-sm text-gray-500">
                Showing {history.results.length} record(s)
              </div>
            </div>
          </div>
        </div>

        {/* Bulk errors / field-errors list */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-800">Field errors</h4>
            <ul className="mt-2 text-sm text-red-600">
              {Object.entries(fieldErrors).map(([k, v]) => (
                <li key={k} className="break-words">
                  <strong className="text-gray-700">{k}:</strong> <span className="text-red-600">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {escalatedResponsibilities.length === 0 && (
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
