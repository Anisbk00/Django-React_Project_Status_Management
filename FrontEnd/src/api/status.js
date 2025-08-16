// src/api/status.js
import api from '../utils/api';

/**
 * Fetch all statuses for a project.
 * @param {number|string} projectId - The project ID.
 * @returns {Promise<Object[]>} List of statuses.
 */
export const fetchProjectStatuses = async (projectId) => {
  try {
    const response = await api.get('/status/', { params: { project_id: projectId } });
    return response.data;
  } catch (err) {
    console.error(`Error fetching statuses for project ${projectId}:`, err);
    throw err;
  }
};

/**
 * Fetch the latest status for a project.
 * @param {number|string} projectId - The project ID.
 * @returns {Promise<Object>} Latest status object.
 */
export const fetchLatestStatus = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/status/`);
    return response.data;
  } catch (err) {
    console.error(`Error fetching latest status for project ${projectId}:`, err);
    throw err;
  }
};

/**
 * Update an existing status.
 * @param {number|string} id - Status ID.
 * @param {Object} data - Partial status object to update.
 * @returns {Promise<Object>} Updated status object.
 */
export const saveStatus = async (id, data) => {
  try {
    const response = await api.patch(`/status/${id}/`, data);
    return response.data;
  } catch (err) {
    console.error(`Error updating status ${id}:`, err);
    throw err;
  }
};

/**
 * Create a new status.
 * @param {Object} data - Status object data.
 * @returns {Promise<Object>} Created status object.
 */
export const createStatus = async (data) => {
  try {
    const response = await api.post('/status/', data);
    return response.data;
  } catch (err) {
    console.error('Error creating status:', err);
    throw err;
  }
};

/**
 * Save a baseline version of a status.
 * @param {number|string} statusId - Status ID.
 * @returns {Promise<Object>} API response.
 */
export const saveBaseline = (statusId) => 
  api.post(`/status/${statusId}/save_baseline/`);

/**
 * Save a final version of a status.
 * @param {number|string} statusId - Status ID.
 * @returns {Promise<Object>} API response.
 */
export const saveFinal = (statusId) => 
  api.post(`/status/${statusId}/save_final/`);

/**
 * Clone data from the previous status into the given status.
 * @param {number|string} statusId - Status ID.
 * @returns {Promise<Object>} API response.
 */
export const clonePrevious = (statusId) => 
  api.post(`/status/${statusId}/clone_previous/`);
