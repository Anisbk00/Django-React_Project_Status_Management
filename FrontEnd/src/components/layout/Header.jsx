import { Bell, Search } from "lucide-react";
import UserDropdown from "../ui/UserDropdown";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="bg-grey/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left Section - Logo / Title */}
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Project Dashboard
          </h1>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="relative p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Notifications"
          >
            <Bell className="text-gray-500" size={20} />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {/* User Info */}
          <div className="hidden sm:block text-sm text-gray-700 text-right">
            <div className="font-medium">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs text-gray-500">{user.role}</div>
          </div>

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
