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
};
