/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, refreshToken as apiRefreshToken } from '../api/auth';

const AuthContext = createContext();

const safeJSONParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('Invalid JSON in localStorage:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const userRaw = localStorage.getItem('user');

      if (token && userRaw && userRaw !== 'undefined') {
        try {
          setUser(JSON.parse(userRaw));
        } catch {
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const tokenResponse = await apiLogin(username, password);

    const userResponse = await fetch('http://localhost:8000/api/users/me/', {
      headers: { Authorization: `Bearer ${tokenResponse.access}` },
    });

    if (!userResponse.ok) throw new Error('User fetch failed');

    const user = await userResponse.json();

    localStorage.setItem('access_token', tokenResponse.access);
    localStorage.setItem('refresh_token', tokenResponse.refresh);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    return { ...tokenResponse, user };
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return;

    try {
      const response = await apiRefreshToken(refresh);
      localStorage.setItem('access_token', response.access);
      return response.access;
    } catch (error) {
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export { AuthContext };
