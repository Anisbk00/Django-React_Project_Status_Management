import { useState, useEffect } from 'react';
import { fetchUsers } from '../../api/users';

const UserSelector = ({ value, onChange, allowClear = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, []);

  if (loading) {
    return (
      <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
        <option>Loading users...</option>
      </select>
    );
  }

  return (
    <div className="flex space-x-2">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select user...</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.first_name} {user.last_name} ({user.role})
          </option>
        ))}
      </select>
      
      {allowClear && value && (
        <button
          onClick={() => onChange(null)}
          className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default UserSelector;