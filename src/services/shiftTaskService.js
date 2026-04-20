import apiClient from "./services.js";

export default {
  /* ── Queries ─────────────────────────────────────────────── */

  getAllTasks(filters = {}) {
    return apiClient.get("shift-tasks", { params: filters });
  },

  getPendingTasks() {
    return apiClient.get("shift-tasks/pending");
  },

  getUserTasks(userId) {
    return apiClient.get(`shift-tasks/user/${userId}`);
  },

  getShiftTasks(shiftId) {
    return apiClient.get(`shift-tasks/shift/${shiftId}`);
  },

  getTask(id) {
    return apiClient.get(`shift-tasks/${id}`);
  },

  /* ── Mutations ───────────────────────────────────────────── */

  createTask(payload) {
    return apiClient.post("shift-tasks", payload);
  },

  updateTask(id, payload) {
    return apiClient.put(`shift-tasks/${id}`, payload);
  },

  startTask(id) {
    return apiClient.patch(`shift-tasks/${id}/start`);
  },

  completeTask(id, payload = {}) {
    return apiClient.patch(`shift-tasks/${id}/complete`, payload);
  },

  cancelTask(id) {
    return apiClient.patch(`shift-tasks/${id}/cancel`);
  },

  deleteTask(id) {
    return apiClient.delete(`shift-tasks/${id}`);
  },
};
