// src/pages/StatusReportPage.jsx
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from 'react';
import reportsApi from '../api/reports';
import { fetchUsers } from '../api/users';
import api from '../utils/api';
import Alert from '../components/ui/Alert'; // adjust if your path differs
import { format } from 'date-fns';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'; // <- fixed import

/* ---------- CSV helper ---------- */
const DownloadCSVButton = ({ filename = 'export.csv', data = [], columns = [] }) => {
  const handleDownload = () => {
    if (!data || !data.length) return;
    const header = columns.map((c) => `"${(c.header || '').replace(/"/g, '""')}"`).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const value = typeof c.accessor === 'function' ? c.accessor(row) : (row[c.accessor] ?? '');
          const safe = value === null || value === undefined ? '' : String(value);
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      type="button"
      className="inline-flex items-center px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700"
    >
      <ArrowDownTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" />
      Export CSV
    </button>
  );
};

/* ---------- Main component ---------- */
const StatusReportPage = () => {
  // summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // projects (for project-scoped filter)
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // user responsibilities
  const [selectedUser, setSelectedUser] = useState('');
  const [userResponsibilities, setUserResponsibilities] = useState([]);
  const [userRespLoading, setUserRespLoading] = useState(false);

  // escalation report (supports backend pagination or plain array)
  const [escalationsRaw, setEscalationsRaw] = useState([]); // array OR { results, next, previous }
  const [escalationsLoading, setEscalationsLoading] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [escalationsError, setEscalationsError] = useState(null); // new: show 403 / other errors

  // filters: project & date-range
  const [selectedProject, setSelectedProject] = useState('');
  const [fromDate, setFromDate] = useState(''); // yyyy-MM-dd
  const [toDate, setToDate] = useState('');   // yyyy-MM-dd

  // client-side pagination fallback when server returns an array
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  /* ---------- initial loads ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setSummaryLoading(true);
      setUsersLoading(true);
      setProjectsLoading(true);
      try {
        const [s, u] = await Promise.all([reportsApi.getProjectSummary(), fetchUsers()]);
        if (!mounted) return;
        setSummary(s);
        setUsers(u || []);
      } catch (err) {
        console.error('Initial load error', err);
      } finally {
        if (mounted) {
          setSummaryLoading(false);
          setUsersLoading(false);
        }
      }
      // load projects for the project filter
      try {
        const { data } = await api.get('/projects/', { params: { page_size: 200 } });
        if (!mounted) return;
        // if API paginates, payload may be { results, next, previous }
        setProjects(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Failed to load projects', err);
      } finally {
        if (mounted) setProjectsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ---------- fetch user responsibilities ---------- */
  useEffect(() => {
    let mounted = true;
    if (!selectedUser) {
      setUserResponsibilities([]);
      setUserRespLoading(false);
      return;
    }
    (async () => {
      setUserRespLoading(true);
      try {
        const resp = await reportsApi.getUserResponsibilities(selectedUser);
        if (!mounted) return;
        // backend returns array of responsibilities
        setUserResponsibilities(Array.isArray(resp) ? resp : []);
      } catch (err) {
        console.error('Failed to load user responsibilities', err);
        if (mounted) setUserResponsibilities([]);
      } finally {
        if (mounted) setUserRespLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedUser]);

  /* ---------- fetch escalation report (supports backend pagination) ---------- */
  const fetchEscalationReport = async (params = {}) => {
    setEscalationsLoading(true);
    setEscalationsError(null);
    try {
      // Build params: backend expects `resolved=true|false` (we will always send resolved)
      const built = {
        ...params,
        resolved: params.resolved ?? (includeResolved ? 'true' : 'false'),
      };

      // only add project/date if present
      if (selectedProject) built.project = selectedProject;
      if (fromDate) built.date_from = fromDate;
      if (toDate) built.date_to = toDate;

      // Use the reports API endpoint
      const { data } = await api.get('/reports/escalation_report/', { params: built });
      setEscalationsRaw(data);
      setPage(1); // reset client page when reloading
    } catch (err) {
      console.error('Failed to fetch escalation report', err);
      setEscalationsRaw([]);
      // surface 403 with friendly message
      if (err?.response?.status === 403) {
        setEscalationsError('You do not have permission to view escalation reports. Contact an administrator.');
      } else {
        setEscalationsError('Failed to load escalation report. Check console for details.');
      }
    } finally {
      setEscalationsLoading(false);
    }
  };

  // re-fetch when includeResolved or filters change
  useEffect(() => {
    fetchEscalationReport({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeResolved, selectedProject, fromDate, toDate]);

  /* ---------- utilities: detect server pagination ---------- */
  const isServerPaginated = useMemo(() => {
    // server paginated responses typically include "results" and "next"/"previous"
    return escalationsRaw && typeof escalationsRaw === 'object' && Array.isArray(escalationsRaw.results);
  }, [escalationsRaw]);

  const serverResults = isServerPaginated ? escalationsRaw.results : Array.isArray(escalationsRaw) ? escalationsRaw : [];
  const serverNext = isServerPaginated ? escalationsRaw.next : null;
  const serverPrev = isServerPaginated ? escalationsRaw.previous : null;

  /* ---------- filtering: project & date-range (client fallback) ---------- */
  const filterByProjectAndDate = (list = []) => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    return list.filter((item) => {
      // pick date fields: prefer created_at then status_date
      const rawDate = item.created_at || item.status_date || item.createdAt || null;
      const date = rawDate ? new Date(rawDate) : null;
      if (selectedProject) {
        // check multiple shapes: project_code or responsibility_details.project_status.project.id
        const matchesProject =
          String(item.project_code || item.project || item.responsibility?.project_status?.project?.id || item.responsibility_details?.project_status?.project?.id || '')
            .includes(String(selectedProject));
        if (!matchesProject) return false;
      }
      if (from && date && date < from) return false;
      if (to && date && date > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  };

  /* ---------- compute displayed escalations and pagination ---------- */
  const filteredEscalations = useMemo(() => {
    const base = isServerPaginated ? serverResults : serverResults;
    return filterByProjectAndDate(base);
  }, [serverResults, selectedProject, fromDate, toDate, isServerPaginated]);

  const totalClientPages = Math.max(1, Math.ceil(filteredEscalations.length / PAGE_SIZE));
  const clientPaged = filteredEscalations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ---------- actions for server pagination (if available) ---------- */
  const goToServerUrl = async (url) => {
    if (!url) return;
    setEscalationsLoading(true);
    setEscalationsError(null);
    try {
      // backend urls returned by DRF are usually full urls; our api wrapper expects relative paths,
      // strip baseUrl if present
      const relative = url.replace(api.defaults.baseURL || '', '');
      const { data } = await api.get(relative);
      setEscalationsRaw(data);
    } catch (err) {
      console.error('Failed to navigate server pagination', err);
      if (err?.response?.status === 403) {
        setEscalationsError('You do not have permission to view escalation reports. Contact an administrator.');
      } else {
        setEscalationsError('Failed to load escalation report page.');
      }
    } finally {
      setEscalationsLoading(false);
    }
  };

  /* ---------- small CSV column defs ---------- */
  const escalationColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Responsibility', accessor: (r) => r.responsibility_title || (r.responsibility_details?.title) || r.responsibility },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Project', accessor: (r) => r.project_code || (r.responsibility_details?.project_status?.project?.code) || '' },
    { header: 'Created By', accessor: 'created_by_name' },
    { header: 'Created At', accessor: (r) => (r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : '') },
  ];

  /* ---------- render ---------- */
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Status Reports</h1>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">Project Summary</h2>
          <div className="flex items-center space-x-2">
            <DownloadCSVButton filename={`project_summary_${new Date().toISOString().slice(0,10)}.csv`} data={summary ? [summary] : []} columns={[
              { header: 'Total Projects', accessor: r => r.total_projects },
              { header: 'In Production', accessor: r => r.in_production },
              { header: 'Escalated Projects', accessor: r => r.escalated_projects },
              { header: 'Escalation Rate', accessor: r => `${r.escalation_rate}%` },
            ]} />
          </div>
        </div>
        {summaryLoading ? <p className="text-sm text-gray-600">Loading summary...</p> : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Total Projects</div>
              <div className="text-xl font-semibold text-gray-800">{summary.total_projects ?? '—'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">In Production</div>
              <div className="text-xl font-semibold text-gray-800">{summary.in_production ?? '—'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Escalated Projects</div>
              <div className="text-xl font-semibold text-gray-800">{summary.escalated_projects ?? '—'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Escalation Rate</div>
              <div className="text-xl font-semibold text-gray-800">{summary.escalation_rate ?? '0'}%</div>
            </div>
          </div>
        ) : <p className="text-sm text-gray-600">No summary data.</p>}
      </div>

      {/* User responsibilities */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">User Responsibilities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Select user</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white text-gray-800">
              <option value="">-- Select user --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Project (filter)</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white text-gray-800">
              <option value="">-- Any project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white text-gray-800" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white text-gray-800" />
          </div>
        </div>

        {userRespLoading ? <p className="text-sm text-gray-600">Loading responsibilities...</p> : userResponsibilities.length === 0 ? (
          <p className="text-sm text-gray-600">No responsibilities for selected user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Title</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Project</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Escalated</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Status Date</th>
                </tr>
              </thead>
              <tbody>
                {userResponsibilities
                  .filter(r => {
                    // apply project & date filters client-side
                    if (selectedProject) {
                      if (!String(r.project_code || '').includes(String(selectedProject))) return false;
                    }
                    if (fromDate || toDate) {
                      const d = r.status_date ? new Date(r.status_date) : null;
                      if (fromDate && d && d < new Date(fromDate)) return false;
                      if (toDate && d && d > new Date(toDate + 'T23:59:59')) return false;
                    }
                    return true;
                  })
                  .map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 text-gray-700">{r.id}</td>
                      <td className="px-4 py-2 text-gray-700">{r.title}</td>
                      <td className="px-4 py-2 text-gray-700">{r.project_code} — {r.project_name}</td>
                      <td className="px-4 py-2 text-gray-700">{r.status_display || r.status}</td>
                      <td className="px-4 py-2 text-gray-700">{r.needs_escalation ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.status_date ? format(new Date(r.status_date), 'yyyy-MM-dd') : '—'}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Escalation report (server-paginated OR array) */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">Escalation Report</h2>
          <div className="flex items-center space-x-2">
            <label className="inline-flex items-center text-sm text-gray-700">
              <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} className="form-checkbox mr-2" />
              Include resolved
            </label>

            <DownloadCSVButton
              filename={`escalation_report_${includeResolved ? 'all' : 'open'}_${new Date().toISOString().slice(0,10)}.csv`}
              data={isServerPaginated ? serverResults : filteredEscalations}
              columns={escalationColumns}
            />
          </div>
        </div>

        {/* Filters summary */}
        <div className="mb-3 text-sm text-gray-600">
          {selectedProject ? <>Project: <strong className="text-gray-800">{projects.find(p => String(p.id) === String(selectedProject))?.code || selectedProject}</strong> • </> : null}
          {fromDate ? <>From: <strong className="text-gray-800">{fromDate}</strong> • </> : null}
          {toDate ? <>To: <strong className="text-gray-800">{toDate}</strong></> : null}
        </div>

        {escalationsLoading ? (
          <p className="text-sm text-gray-600">Loading escalation report...</p>
        ) : escalationsError ? (
          <div className="mb-3 p-3 rounded bg-yellow-50 text-sm text-yellow-800">{escalationsError}</div>
        ) : (isServerPaginated ? serverResults.length === 0 : filteredEscalations.length === 0) ? (
          <p className="text-sm text-gray-600">No escalation records.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 font-medium text-gray-700">ID</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Responsibility</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Reason</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Project</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Created By</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Created At</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Resolved</th>
                  </tr>
                </thead>

                <tbody>
                  {(isServerPaginated ? serverResults : clientPaged).map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2 text-gray-700">{e.id}</td>
                      <td className="px-4 py-2 text-gray-700">{e.responsibility_title || e.responsibility_details?.title || e.responsibility}</td>
                      <td className="px-4 py-2 text-gray-700 break-words">{e.reason}</td>
                      <td className="px-4 py-2 text-gray-700">{e.project_code || (e.responsibility_details?.project_status?.project?.code) || '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{e.created_by_name || e.created_by_details?.username || e.created_by}</td>
                      <td className="px-4 py-2 text-gray-700">{e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd HH:mm') : '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{e.resolved ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="mt-3 flex items-center justify-between">
              {/* server pagination controls */}
              {isServerPaginated ? (
                <div className="flex items-center space-x-2">
                  <button disabled={!serverPrev} onClick={() => goToServerUrl(serverPrev)} className={`px-3 py-1 border rounded ${serverPrev ? 'text-gray-700' : 'text-gray-400'}`}>Prev</button>
                  <button disabled={!serverNext} onClick={() => goToServerUrl(serverNext)} className={`px-3 py-1 border rounded ${serverNext ? 'text-gray-700' : 'text-gray-400'}`}>Next</button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`px-3 py-1 border rounded ${page > 1 ? 'text-gray-700' : 'text-gray-400'}`}>Prev</button>
                  <div className="text-sm text-gray-600">Page {page} / {totalClientPages}</div>
                  <button disabled={page >= totalClientPages} onClick={() => setPage(p => Math.min(totalClientPages, p + 1))} className={`px-3 py-1 border rounded ${page < totalClientPages ? 'text-gray-700' : 'text-gray-400'}`}>Next</button>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Showing {(isServerPaginated ? serverResults.length : clientPaged.length)} record(s)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusReportPage;
