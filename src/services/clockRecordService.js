import apiClient from "./services.js";

export default {
  clockIn(payload) {
    return apiClient.post("/clock-records/clock-in", payload);
  },

  clockOut(clockRecordId) {
    return apiClient.patch(`/clock-records/${clockRecordId}/clock-out`, {});
  },

  getMyRecords() {
    return apiClient.get("/clock-records/me");
  },

  getMyOpenRecord() {
    return apiClient.get("/clock-records/me/open");
  },
};

