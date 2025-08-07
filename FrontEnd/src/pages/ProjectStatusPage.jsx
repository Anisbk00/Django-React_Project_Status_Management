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

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        const projectData = await fetchProjectDetails(projectId);
        setProject(projectData);
        
        const statusData = await fetchLatestStatus(projectId);
        setStatus(statusData);
        
        const statusesData = await fetchProjectStatuses(projectId);
        setStatuses(statusesData);
      } catch (err) {
        setError('Failed to load project data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
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
      
      // Refresh statuses list
      const statusesData = await fetchProjectStatuses(projectId);
      setStatuses(statusesData);
    } catch (err) {
      setError('Failed to save project status');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResponsibilityChange = (updatedResponsibility) => {
    if (!status) return;
    
    const updatedResponsibilities = status.responsibilities.map(resp => 
      resp.id === updatedResponsibility.id ? updatedResponsibility : resp
    );
    
    setStatus({
      ...status,
      responsibilities: updatedResponsibilities
    });
  };

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;
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