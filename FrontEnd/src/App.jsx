import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute'; // Adjust path accordingly
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProjectStatusPage from './pages/ProjectStatusPage';
import NotFoundPage from './pages/NotFoundPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NewProjectPage from './pages/NewProjectPage';


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
              <Route path="/projects/new" element={<NewProjectPage />} />
              <Route path="/projects/:projectId" element={<ProjectStatusPage />} />
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
