import api from '../utils/api';

export const fetchUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};