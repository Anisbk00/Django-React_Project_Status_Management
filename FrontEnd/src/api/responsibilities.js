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
  // Only send IDs for foreign keys
  const payload = {
    title: data.title,
    status: data.status,
    progress: data.progress,
    project_status: typeof data.project_status === 'object' ? data.project_status.id : data.project_status,
    responsible: typeof data.responsible === 'object' ? data.responsible.id : data.responsible,
    deputy: data.deputy ? (typeof data.deputy === 'object' ? data.deputy.id : data.deputy) : null,
    needs_escalation: data.needs_escalation || false,
    comments: data.comments || '',
  };

  const response = await api.post('/responsibilities/', payload);
  return response.data;
};
