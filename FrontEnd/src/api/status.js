import api from '../utils/api';

export const saveStatus = async (id, data) => {
  const response = await api.patch(`/status/${id}/`, data);
  return response.data;
};