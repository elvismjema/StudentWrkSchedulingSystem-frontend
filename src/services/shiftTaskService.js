import apiClient from "./services.js";

export default {
  getUserTasks(userId) {
    return apiClient.get(`shift-tasks/user/${userId}`);
  },

  getShiftTasks(shiftId) {
    return apiClient.get(`shift-tasks/shift/${shiftId}`);
  },

  updateTask(id, payload) {
    return apiClient.put(`shift-tasks/${id}`, payload);
  },

  startTask(id) {
    return apiClient.patch(`shift-tasks/${id}/start`);
  },

  completeTask(id) {
    return apiClient.patch(`shift-tasks/${id}/complete`);
  },
};
