import api from '../utils/api';

export const fetchProjects = async () => {
  const response = await api.get('/projects/');
  return response.data;
};

export const fetchProjectDetails = async (id) => {
  const response = await api.get(`/projects/${id}/`);
  return response.data;
};

export const fetchProjectStatuses = async (projectId) => {
  const response = await api.get('/status/', { params: { project_id: projectId } });
  return response.data;
};