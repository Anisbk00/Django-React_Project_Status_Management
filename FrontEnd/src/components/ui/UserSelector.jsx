/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { fetchUsers } from '../../api/users';
import clsx from 'clsx';

const UserSelector = ({
  value,
  onChange,
  allowClear = false,
  id,
  className,
  placeholder = 'Select user',
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data : data.results ?? []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  // Normalize incoming value so the select matches one of the <option> values:
  // - If value is an object, use its id
  // - If value is a number/string, use it as-is (stringified for value attr)
  const selectedValue = (() => {
    if (value == null) return '';
    if (typeof value === 'object') return String(value.id ?? value.pk ?? '');
    return String(value);
  })();

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (!val) {
      onChange && onChange(null);
      return;
    }
    // prefer returning user object (so parent components can keep details),
    // but fall back to numeric id if we can't find the user in loaded list.
    const found = users.find((u) => String(u.id) === val || String(u.pk) === val);
    if (found) {
      onChange && onChange(found);
    } else {
      const numeric = Number(val);
      onChange && onChange(Number.isNaN(numeric) ? val : numeric);
    }
  };

  if (loading) {
    return (
      <select
        disabled
        className={clsx(
          'w-full h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed',
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
        value={selectedValue}
        onChange={handleSelectChange}
        className={clsx(
          'w-full h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          className
        )}
        aria-label="User selector"
      >
        <option value="">{placeholder}</option>

        {users.map((user) => {
          const label =
            (user.full_name && user.full_name.trim()) ||
            `${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() ||
            user.username ||
            `User ${user.id}`;

          // Inline style ensures option text is visible even with aggressive global CSS.
          return (
            <option
              key={user.id}
              value={String(user.id)}
              // note: many browsers ignore option classNames; inline style is the most reliable
              style={{ color: '#111827' }} // tailwind 'text-gray-900' hex
            >
              {label}
            </option>
          );
        })}
      </select>

      {allowClear && selectedValue && (
        <button
          type="button"
          onClick={() => onChange && onChange(null)}
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
