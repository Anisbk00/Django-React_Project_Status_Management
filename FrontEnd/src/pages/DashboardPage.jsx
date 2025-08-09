import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import { fetchProjects } from '../api/projects';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';




const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  console.log('User:', user, 'AuthLoading:', authLoading);
  useEffect(() => {
    console.log("DashboardPage mounted");
    // Wait until auth finished initializing (so token/header is ready)
    if (authLoading) return;

    const loadProjects = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching projects now...');
        const data = await fetchProjects();
        console.log('📦 Projects from API (dashboard):', data);
        setProjects(data);
      } catch (err) {
        console.error('❌ Failed to fetch projects:', err?.response?.data || err.message || err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // If user exists (logged in), fetch projects. Otherwise, clear state.
    if (user) {
      loadProjects();
    } else {
      // no user -> likely not authenticated; make sure UI isn't stuck loading
      setLoading(false);
      setProjects([]);
    }
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 font-medium mt-10">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Projects Dashboard</h1>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-md transition"
        >
          <Plus size={18} /> New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <Plus size={40} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No projects found</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            You haven’t added any projects yet. Click the button above to create your first project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                  <p className="text-sm text-gray-500">{project.code}</p>
                </div>
                <StatusBadge status={project.current_phase || 'PLAN'} />
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Phase:</span> {project.phase_display}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Manager:</span>{' '}
                  {project.manager_details?.first_name} {project.manager_details?.last_name}
                </p>
              </div>

              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  Updated: {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}
                </span>
                <Link
                  className="font-medium text-blue-600 hover:text-blue-800"
                  to={`/projects/${project.id}`}
                >
                  View →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
