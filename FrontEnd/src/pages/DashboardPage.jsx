import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import { fetchProjects } from '../api/projects';

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Projects Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <Card key={project.id}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                <p className="text-sm text-gray-600">{project.code}</p>
              </div>
              <StatusBadge status={project.current_status || 'G'} />
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Phase:</span> {project.get_phase_display}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Manager:</span> {project.manager_details?.first_name} {project.manager_details?.last_name}
              </p>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Updated: {new Date(project.updated_at).toLocaleDateString()}
              </span>
              <a 
                href={`/projects/${project.id}`} 
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View Details →
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;