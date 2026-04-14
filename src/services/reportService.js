import apiClient from "./services.js";

export default {
  getShiftCoverage(params = {}) {
    return apiClient.get("reports/shift-coverage", { params });
  },

  getHoursWorked(params = {}) {
    return apiClient.get("reports/hours-worked", { params });
  },

  getAttendance(params = {}) {
    return apiClient.get("reports/attendance", { params });
  },

  getTimeOff(params = {}) {
    return apiClient.get("reports/time-off", { params });
  },

  getTaskCompletion() {
    return apiClient.get("reports/task-completion");
  },
};
