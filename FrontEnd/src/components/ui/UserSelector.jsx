import { useState, useEffect } from 'react';
import { fetchUsers } from '../../api/users';
import clsx from 'clsx';

const UserSelector = ({ value, onChange, allowClear = false, id, className }) => {
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
      <select
        disabled
        className={clsx(
          "w-full h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed",
          className
        )}
        aria-label="Loading users"
      >
        <option>Loading users...</option>
      </select>
    );
  }

  return (
    <div className="flex space-x-2 items-center w-full">
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className={clsx(
          "w-full h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          className
        )}
        aria-label="User selector"
      >
        <option value="">Select user</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.first_name} {user.last_name}
          </option>
        ))}
      </select>
      
      {allowClear && value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="Clear selection"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default UserSelector;
