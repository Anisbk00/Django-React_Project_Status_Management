import api from '../utils/api';

export const fetchProjects = async () => {
  const response = await api.get('/projects/');
  console.log(response)
  // Handle paginated or direct array response
  if (response.data?.results) {
    return response.data.results;
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchProjectDetails = async (id) => {
  const response = await api.get(`/projects/${id}/`);
  return response.data;
};

export const fetchProjectStatuses = async (projectId) => {
  const response = await api.get('/status/', { params: { project_id: projectId } });
  return response.data;
};

export const fetchLatestStatus = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/status/`);
  return response.data;
};