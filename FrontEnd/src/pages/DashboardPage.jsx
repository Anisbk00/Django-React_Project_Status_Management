/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import { fetchProjects,fetchLatestStatus } from '../api/projects';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import NewProjectPage from '../pages/NewProjectPage';
import { useNavigate } from 'react-router-dom';


const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (authLoading) return;

    const loadProjects = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchProjects();
        console.log('RAW PROJECT DATA:', data);

        // NEW: fetch status for each project and merge it
        const projectsWithStatus = await Promise.all(
          data.map(async (proj) => {
            try {
              const statusData = await fetchLatestStatus(proj.id);
              return { ...proj, status: statusData?.status || 'G' };
            } catch {
              return { ...proj, status: 'G' };
            }
          })
        );

        setProjects(projectsWithStatus);
      } catch (err) {
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProjects();
    } else {
      setLoading(false);
      setProjects([]);
    }
  }, [user, authLoading]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesManager =
        !selectedManagerId || project.manager_details?.id === selectedManagerId;

      const matchesPhase =
        !selectedPhase || project.current_phase === selectedPhase;

      const matchesStatus =
        !selectedStatus || project.status?.toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesManager && matchesPhase && matchesStatus;
    });
  }, [projects, searchTerm, selectedManagerId, selectedPhase, selectedStatus]);

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
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row items-end gap-4 mb-8 flex-wrap bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-grow min-w-[220px]">
          <SearchBar
            placeholder="Search projects by name or code..."
            onSearch={setSearchTerm}
          />
        </div>

        <div className="w-44 min-w-[150px]">
          <label htmlFor="phaseFilter" className="block mb-1 font-medium text-gray-700">
            Phase
          </label>
          <select
            id="phaseFilter"
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="w-full h-[42px] px-3 py-2 rounded-md shadow-sm text-gray-700 border-0 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Phases</option>
            <option value="PLAN">Planning</option>
            <option value="DEV">Development</option>
            <option value="TEST">Testing</option>
            <option value="PROD">Production</option>
            <option value="COMP">Completed</option>
          </select>
        </div>

        <div className="w-44 min-w-[150px]">
          <label htmlFor="statusFilter" className="block mb-1 font-medium text-gray-700">
            Status
          </label>
          <select
            id="statusFilter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-[42px] px-3 py-2 rounded-md shadow-sm text-gray-700 border-0 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="G">Green</option>
            <option value="Y">Yellow</option>
            <option value="R">Red</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <Plus size={40} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No projects found</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Try adjusting your filters or add a new project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow duration-200 border border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                  <p className="text-sm text-gray-500">{project.code}</p>
                </div>
                <StatusBadge status={project.status || 'G'} />
              </div>

              <div className="mt-4 space-y-1 ">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Phase:</span> {project.phase_display}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium ">Manager:</span>{' '}
                  {project.manager_details && (project.manager_details.first_name || project.manager_details.last_name)
                    ? `${project.manager_details.first_name ?? ''} ${project.manager_details.last_name ?? ''}`
                    : <span className="text-gray-400 italic">Not assigned</span>
                  }
                </p>
              </div>

              <div className="mt-4 flex justify-between items-center text-sm ">
                <span className="text-gray-500">
                  Updated: {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}
                </span>
                <Link
                  className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
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
