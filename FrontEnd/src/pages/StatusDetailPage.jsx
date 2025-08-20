// src/pages/StatusDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStatusById, fetchLatestStatus } from '../api/status';
import ResponsibilityItem from '../components/project/ResponsibilityItem';
import Alert from '../components/ui/Alert'; // adjust path if different

const StatusDetailPage = ({ currentUser }) => {
  const { projectId, statusId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const loadById = async (id) => {
      try {
        const data = await fetchStatusById(id);
        if (!mounted) return;
        setStatus(data);
        setLoading(false);
      } catch (err) {
        // if 404 and projectId available, fallback to latest project status
        const code = err?.response?.status;
        if (code === 404 && projectId) {
          try {
            const latest = await fetchLatestStatus(projectId);
            if (!mounted) return;
            if (!latest) {
              setError('No status found for this project.');
              setLoading(false);
              return;
            }
            setStatus(latest);
            setLoading(false);
          } catch (err2) {
            console.error('Fallback fetchLatestStatus failed', err2);
            setError('Status not found.');
            setLoading(false);
          }
        } else {
          console.error('fetchStatusById failed', err);
          setError('Status not found.');
          setLoading(false);
        }
      }
    };

    const loadFallbackLatest = async (projId) => {
      try {
        const latest = await fetchLatestStatus(projId);
        if (!mounted) return;
        setStatus(latest);
      } catch (err) {
        console.error('fetchLatestStatus error', err);
        setError('Failed to load project status.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // prefer explicit statusId if present
    if (statusId) {
      loadById(statusId);
    } else if (projectId) {
      loadFallbackLatest(projectId);
    } else {
      setError('No projectId or statusId provided in route.');
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" message={error} />
        <div className="mt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 rounded text-gray-800"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6">
        <Alert type="info" message="No status available." />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">{status.project?.name ?? 'Project'}</h1>
        <p className="text-sm text-gray-600">
          Status date: {status.status_date ?? '—'} • Phase: {status.phase} {status.phase_display ? `(${status.phase_display})` : ''}
        </p>
        {status.notes && <div className="mt-2 text-gray-700 whitespace-pre-line">{status.notes}</div>}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-800">Responsibilities</h2>
        {Array.isArray(status.responsibilities) && status.responsibilities.length > 0 ? (
          <div className="mt-4 space-y-3">
            {status.responsibilities.map((r) => (
              <ResponsibilityItem key={r.id} responsibility={r} onChange={() => { /* optionally refetch */ }} currentUser={currentUser} />
            ))}
          </div>
        ) : (
          <div className="mt-4 text-gray-600">No responsibilities for this status.</div>
        )}
      </div>
    </div>
  );
};

export default StatusDetailPage;
