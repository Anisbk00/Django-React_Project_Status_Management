import UserDropdown from '../ui/UserDropdown';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">Project Status Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {user.first_name} {user.last_name} ({user.role})
          </div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;