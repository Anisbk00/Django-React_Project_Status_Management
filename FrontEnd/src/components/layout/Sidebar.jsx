/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  CogIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Create project', path: '/projects/new', icon: ChartBarIcon }, 
    { name: 'Status Reports', path: '/reports/status', icon: ClipboardDocumentListIcon },
    { name: 'Settings', path: '/settings', icon: CogIcon }, // ✅ added
  ];

  const renderNavItems = (onClick) =>
    navItems.map(({ name, path, icon: Icon }) => (
      <NavLink
        key={name}
        to={path}
        className={({ isActive }) =>
          `group flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-colors
          ${
            isActive
              ? 'bg-indigo-700 text-white shadow-lg'
              : 'text-gray-400 hover:bg-indigo-600 hover:text-white'
          }`
        }
        onClick={onClick}
      >
        <Icon className="mr-3 h-6 w-6 flex-shrink-0" aria-hidden="true" />
        {name}
      </NavLink>
    ));

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-700 bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open sidebar"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside className="relative flex flex-col max-w-xs w-full h-full bg-gray-900 shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <h2 className="text-white text-xl font-bold">Project Status</h2>
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setMobileMenuOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-2 space-y-1">{renderNavItems(() => setMobileMenuOpen(false))}</nav>
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-900 h-screen sticky top-0 shadow-lg">
          <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-gray-700">
            <h2 className="text-white text-2xl font-bold tracking-wide">Project Status</h2>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {renderNavItems()}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
