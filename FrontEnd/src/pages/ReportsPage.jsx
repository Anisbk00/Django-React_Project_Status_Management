import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { fetchProjectSummary, fetchUserWorkload, fetchEscalationReport } from '../api/reports';
import Loader from '../components/ui/Loader';
import Table from '../components/ui/Table';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage = () => {
  const [summary, setSummary] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const summaryData = await fetchProjectSummary();
        setSummary(summaryData);
        
        const workloadData = await fetchUserWorkload();
        setWorkload(workloadData);
        
        const escalationData = await fetchEscalationReport();
        setEscalations(escalationData);
      } catch (error) {
        console.error('Failed to load report data', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Project Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{summary.total_projects}</p>
              <p className="text-sm text-gray-600">Total Projects</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{summary.in_production}</p>
              <p className="text-sm text-gray-600">In Production</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{summary.escalated_projects}</p>
              <p className="text-sm text-gray-600">Escalated Projects</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{summary.escalation_rate}%</p>
              <p className="text-sm text-gray-600">Escalation Rate</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Project Phase Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={summary.phase_distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="phase"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {summary.phase_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">User Workload</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={workload}
              margin={{
                top: 5, right: 30, left: 20, bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="username" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_responsibilities" name="Responsibilities" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={summary.status_distribution}
              margin={{
                top: 5, right: 30, left: 20, bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="Count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Active Escalations</h2>
        <Table
          columns={[
            { Header: 'Project', accessor: 'project_code' },
            { Header: 'Responsibility', accessor: 'responsibility_title' },
            { Header: 'Reason', accessor: 'reason' },
            { Header: 'Created By', accessor: 'created_by_name' },
            { Header: 'Date', accessor: 'created_at' },
          ]}
          data={escalations.map(e => ({
            ...e,
            created_at: new Date(e.created_at).toLocaleDateString()
          }))}
        />
      </div>
    </div>
  );
};

export default ReportsPage;