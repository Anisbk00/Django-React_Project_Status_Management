import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/project/ProjectHeader';
import ResponsibilityList from '../components/project/ResponsibilityList';
import StatusSavePanel from '../components/project/StatusSavePanel';
import EscalationPanel from '../components/project/EscalationPanel';
import StatusTimeline from '../components/project/StatusTimeline';
import { 
  fetchProjectDetails, 
  fetchProjectStatuses,
  fetchLatestStatus
} from '../api/projects';
import { saveStatus } from '../api/status';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/ui/Loader';
import Alert from '../components/ui/Alert';

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

  const loadProjectData = async () => {
    try {
      setLoading(true);
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
      setError(err.response?.data?.message || 'Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

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

      // Optimistic refresh
      setStatuses(prev =>
        prev.map(s => (s.id === savedStatus.id ? savedStatus : s))
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save project status.');
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
      console.error('Failed to refresh statuses after responsibility creation', err);
    }
  };

  if (loading) return <Loader />;
  if (error) return (
    <Alert 
      type="error" 
      message={error} 
      actionLabel="Retry"
      onAction={loadProjectData}
    />
  );
  if (!project || !status) return <Alert type="info" message="Project not found" />;

  return (
    <div className="space-y-6">
      <ProjectHeader 
        project={project} 
        status={status} 
        onBack={() => navigate('/dashboard')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ResponsibilityList 
            responsibilities={status.responsibilities} 
            onResponsibilityChange={handleResponsibilityChange}
            onResponsibilityCreated={handleResponsibilityCreated}
            currentUser={user}
          />

          <StatusSavePanel 
            onSave={handleSaveStatus} 
            isSaving={isSaving}
            isBaseline={status.is_baseline}
            isFinal={status.is_final}
          />
        </div>

        <div className="space-y-6">
          <EscalationPanel 
            responsibilities={status.responsibilities}
            projectId={projectId}
            statusId={status.id}
          />

          <StatusTimeline 
            statuses={statuses} 
            currentStatusId={status.id}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusPage;
