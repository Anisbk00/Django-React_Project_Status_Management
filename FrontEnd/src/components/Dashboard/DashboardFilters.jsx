// DashboardFilters.jsx (style-enhanced version)
import { useState } from 'react';
import SearchBar from '../ui/SearchBar';
import Select from '../ui/Select';

const DashboardFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    search: '',
    phase: '',
    status: '',
  });

  const handleChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <SearchBar 
            onSearch={(value) => handleChange('search', value)}
            placeholder="Search projects..."
            className="w-full"
          />
        </div>
        
        <div>
          <Select
            label="Phase"
            value={filters.phase}
            onChange={(e) => handleChange('phase', e.target.value)}
            options={[
              { value: '', label: 'All Phases' },
              { value: 'PLAN', label: 'Planning' },
              { value: 'DEV', label: 'Development' },
              { value: 'TEST', label: 'Testing' },
              { value: 'PROD', label: 'Production' },
              { value: 'COMP', label: 'Completed' },
            ]}
            className="w-full"
          />
        </div>
        
        <div>
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'G', label: 'Green' },
              { value: 'Y', label: 'Yellow' },
              { value: 'R', label: 'Red' },
            ]}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
