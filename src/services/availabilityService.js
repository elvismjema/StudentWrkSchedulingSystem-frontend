import apiClient from "./services.js";

export default {
  listForUser(userId) {
    return apiClient.get(`/availabilities/user/${userId}`);
  },

  listForDepartment(departmentId, filters = {}) {
    const params = new URLSearchParams();
    params.append('departmentId', departmentId);
    if (filters.requestStatus) params.append('requestStatus', filters.requestStatus);
    if (filters.availabilityType) params.append('availabilityType', filters.availabilityType);
    return apiClient.get(`/availabilities?${params.toString()}`);
  },

  create(payload) {
    return apiClient.post("/availabilities", payload);
  },

  update(id, payload) {
    return apiClient.put(`/availabilities/${id}`, payload);
  },

  updateStatus(id, statusPayload) {
    return apiClient.patch(`/availabilities/${id}/status`, statusPayload);
  },

  remove(id) {
    return apiClient.delete(`/availabilities/${id}`);
  },

  syncClassSchedule(payload = {}) {
    return apiClient.post('/student/availability/sync-class-schedule', payload);
  },

  getClassSyncStatus() {
    return apiClient.get('/student/availability/class-sync-status');
  },
};

