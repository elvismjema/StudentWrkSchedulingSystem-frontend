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

  getManagerWorkerBlockingAvailability(userId, params = {}) {
    const query = new URLSearchParams();
    if (params.department_id != null) query.append('department_id', params.department_id);
    if (params.shift_date) query.append('shift_date', params.shift_date);
    if (params.start_time) query.append('start_time', params.start_time);
    if (params.end_time) query.append('end_time', params.end_time);
    return apiClient.get(`/manager/workers/${userId}/blocking-availability?${query.toString()}`);
  },
};

