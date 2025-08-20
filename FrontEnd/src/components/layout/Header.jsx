// src/components/layout/Header.jsx
/* eslint-disable no-unused-vars */
import { Bell, Search } from "lucide-react";
import { NavLink } from 'react-router-dom';
import { DocumentChartBarIcon, HomeIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import UserDropdown from "../ui/UserDropdown";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left: Logo / Title */}
        <div className="flex items-center space-x-4">
          <div className="mr-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
              Project Dashboard
            </h1>
          </div>

          {/* Top navigation (hidden on very small screens) */}
          <nav className="hidden sm:flex items-center space-x-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Dashboard
            </NavLink>

            <NavLink
              to="/projects/new"
              className={({ isActive }) =>
                `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Create
            </NavLink>

            <NavLink
              to="/reports/status"
              className={({ isActive }) =>
                `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <DocumentChartBarIcon className="h-5 w-5 mr-2" />
              Reports
            </NavLink>
          </nav>
        </div>

        {/* Right: Actions & user */}
        <div className="flex items-center space-x-4">


          {/* Notifications */}
          <button
            className="relative p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Notifications"
          >
            <Bell className="text-gray-500" size={20} />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {/* User info (hidden on xs) */}
          <div className="hidden sm:block text-sm text-gray-700 text-right">
            <div className="font-medium">
              {user?.first_name || user?.username} {user?.last_name || ''}
            </div>
            <div className="text-xs text-gray-500">{user?.role}</div>
          </div>

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
