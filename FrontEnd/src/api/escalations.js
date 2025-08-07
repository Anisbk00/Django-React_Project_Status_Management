import api from '../utils/api';

export const triggerEscalation = async (data) => {
  const response = await api.post('/escalations/', data);
  return response.data;
};

export const resolveEscalation = async (id) => {
  const response = await api.post(`/escalations/${id}/resolve_escalation/`);
  return response.data;
};