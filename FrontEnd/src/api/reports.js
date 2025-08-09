// frontend/src/api/reports.js
import api from '../utils/api';

/**
 * Reports API Service
 * Handles all reporting-related API operations
 */
export default {
  /**
   * Fetch project summary statistics
   * @returns {Promise<Object>} Summary data object
   */
  getProjectSummary: async () => {
    const { data } = await api.get('/reports/project_summary/');
    return data;
  },

  /**
   * Fetch responsibilities for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of user responsibilities
   */
  getUserResponsibilities: async (userId) => {
    const { data } = await api.get('/reports/user_responsibilities/', {
      params: { user_id: userId },
    });
    return data;
  },

  /**
   * Fetch escalation report data
   * @param {boolean} includeResolved - Include resolved escalations
   * @returns {Promise<Array>} List of escalations
   */
  getEscalationReport: async (includeResolved = false) => {
    const { data } = await api.get('/reports/escalation_report/', {
      params: { include_resolved: includeResolved },
    });
    return data;
  },

};