// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute'; // Adjust path accordingly
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProjectStatusPage from './pages/ProjectStatusPage';
import StatusDetailPage from './pages/StatusDetailPage';    // NEW
import NotFoundPage from './pages/NotFoundPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NewProjectPage from './pages/NewProjectPage';
import StatusReportPage from './pages/StatusReportPage'; // NEW
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from './pages/ProfilePage';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/projects/new" element={<NewProjectPage />} />

              {/* project overview / latest status page */}
              <Route path="/projects/:projectId" element={<ProjectStatusPage />} />

              {/* project status detail (explicit nested route) */}
              <Route path="/projects/:projectId/status/:statusId" element={<StatusDetailPage />} />

              <Route path="/status/:statusId" element={<StatusDetailPage />} />

              {/* Reports */}
              <Route path="/reports/status" element={<StatusReportPage />} />

              <Route path="/settings" element={<SettingsPage />} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
