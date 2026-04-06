import apiClient from "./services.js";

export default {
  // ── Templates ────────────────────────────────────────────────────────────

  listTemplates(departmentId, isActive) {
    const params = new URLSearchParams();
    if (departmentId) params.append("department_id", departmentId);
    if (isActive !== undefined) params.append("is_active", isActive);
    return apiClient.get(`schedule-templates?${params.toString()}`);
  },

  getTemplate(id) {
    return apiClient.get(`schedule-templates/${id}`);
  },

  createTemplate(payload) {
    return apiClient.post("schedule-templates", payload);
  },

  updateTemplate(id, payload) {
    return apiClient.put(`schedule-templates/${id}`, payload);
  },

  setActiveStatus(id, isActive) {
    return apiClient.patch(`schedule-templates/${id}/active`, { is_active: isActive });
  },

  deleteTemplate(id) {
    return apiClient.delete(`schedule-templates/${id}`);
  },

  duplicateTemplate(id, newName) {
    return apiClient.post(`schedule-templates/${id}/duplicate`, { template_name: newName });
  },

  // ── Conflict checks ───────────────────────────────────────────────────────

  checkConflicts(id, startDate) {
    const params = startDate ? `?start_date=${startDate}` : "";
    return apiClient.get(`schedule-templates/${id}/conflicts${params}`);
  },

  // ── Publish ───────────────────────────────────────────────────────────────

  publishTemplate(id, startDate, publishImmediately = false) {
    return apiClient.post(`schedule-templates/${id}/publish`, {
      start_date: startDate,
      publish_immediately: publishImmediately,
    });
  },
};
