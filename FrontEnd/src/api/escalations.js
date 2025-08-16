// src/api/escalations.js
import api from '../utils/api';

/**
 * Fetch escalations.
 * - If `params.url` is provided, calls that URL (useful for DRF next/previous).
 * - If `params.project` is provided, uses the by_project action: /escalations/by_project/
 * - Otherwise calls /escalations/ with params.
 */
export const fetchEscalations = async (params = {}) => {
  if (params.url) {
    const { data } = await api.get(params.url);
    return data;
  }

  if (params.project) {
    const { data } = await api.get('/escalations/by_project/', { params });
    return data;
  }

  const { data } = await api.get('/escalations/', { params });
  return data;
};

/**
 * Create an escalation (POST /escalations/)
 */
export const triggerEscalation = async (payload) => {
  const { data } = await api.post('/escalations/', payload);
  return data;
};

/**
 * Resolve an escalation.
 * - Tries POST /escalations/{id}/resolve_escalation/ (custom action) first.
 * - If that fails (404 or 405), falls back to PATCH /escalations/{id}/ { resolved: true }.
 */
export const resolveEscalation = async (id) => {
  try {
    const { data } = await api.post(`/escalations/${id}/resolve_escalation/`);
    return data;
  } catch (err) {
    // If custom action not available or method not allowed, try PATCH fallback.
    const status = err?.response?.status;
    if (status === 404 || status === 405 || status === 400) {
      const { data } = await api.patch(`/escalations/${id}/`, { resolved: true });
      return data;
    }
    // otherwise re-throw so caller can handle it
    throw err;
  }
};
