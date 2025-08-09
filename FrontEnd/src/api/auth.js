import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api'; // change if needed

// Login request
export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/token/`, { username, password });
  return response.data; // { access, refresh, user }
};

// Refresh token request
export const refreshToken = async (refresh) => {
  const response = await axios.post(`${API_URL}/token/refresh/`, { refresh });
  return response.data; // { access }
};
