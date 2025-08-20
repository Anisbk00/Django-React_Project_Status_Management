import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/solid'; // Added UserCircleIcon
import { useAuth } from '../../context/AuthContext';
import { Link } from "react-router-dom";

const UserDropdown = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button
            className="inline-flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="User menu"
          >
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-lg select-none">
              {/* Replace initials with default avatar */}
              <UserCircleIcon className="h-8 w-8 text-white" />
            </div>
            <ChevronDownIcon
              className={`ml-2 h-5 w-5 text-gray-500 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
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
              static
            >
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>

              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      <Link to="/profile" className="hover:text-blue-500">Profile</Link>
                    }}
                  >
                    Profile
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      
                    }}
                  >
                    Settings
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={logout}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    Sign out
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default UserDropdown;
