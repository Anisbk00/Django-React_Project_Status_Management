/* eslint-disable no-unused-vars */
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const UserDropdown = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = `${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}`.toUpperCase();

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button
            aria-label="User menu"
            className="inline-flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm select-none"
              style={{ backgroundColor: user.avatar_color || '#6366f1' }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.first_name || user.email}'s avatar`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-600">
                  <UserCircleIcon className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
              )}
            </div>

            <ChevronDownIcon
              className={`ml-2 h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
            >
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {user.role && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 "
                    style={{ backgroundColor: '#ff3333ff' }}>
                      {user.role}
                    </span>
                  </div>
                )}
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/profile"
                      className={`block px-4 py-2 text-sm ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                    >
                      Profile
                    </Link>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={logout}
                      className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                    >
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default UserDropdown;
