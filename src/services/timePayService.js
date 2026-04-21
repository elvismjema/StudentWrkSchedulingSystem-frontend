import apiClient from "./services.js";

export default {
  listTimecards(params = {}) {
    return apiClient.get("/clock-records/manager/timecards", { params });
  },

  getTimecardDetail(userId, params = {}) {
    return apiClient.get(`/clock-records/manager/timecards/${userId}`, { params });
  },

  updateTimecardStatus(userId, payload) {
    return apiClient.patch(`/clock-records/manager/timecards/${userId}/status`, payload);
  },

  approveAll(payload) {
    return apiClient.post("/clock-records/manager/timecards/approve-all", payload);
  },

  /**
   * Create a manual clock record for a worker (no shift attached).
   * Used when a worker forgot to clock in or the manager needs to add hours.
   * @param {number} userId
   * @param {{ clock_in: string, clock_out?: string, note?: string }} payload
   */
  createManualEntry(userId, payload) {
    return apiClient.post(`/clock-records/manager/timecards/${userId}/manual-entry`, payload);
  },

  /**
   * Delete a manual clock record. Only works on shift-less (manual) records.
   * Real clock-in/out records tied to a shift are protected on the backend.
   * @param {number} clockId
   */
  deleteManualEntry(clockId) {
    return apiClient.delete(`/clock-records/manager/entries/${clockId}`);
  },
};
