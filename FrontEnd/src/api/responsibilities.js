import api from '../utils/api';

export const fetchResponsibilities = async (statusId) => {
  const response = await api.get('/responsibilities/', { params: { project_status: statusId } });
  return response.data;
};

export const updateResponsibility = async (id, data) => {
  const response = await api.patch(`/responsibilities/${id}/`, data);
  return response.data;
};

export const createResponsibility = async (data) => {
  const response = await api.post('/responsibilities/', data);
  return response.data;
};