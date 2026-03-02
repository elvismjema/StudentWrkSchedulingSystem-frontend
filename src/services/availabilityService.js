import apiClient from "./services.js";

export default {
  listForUser(userId) {
    return apiClient.get(`/availabilities/user/${userId}`);
  },

  create(payload) {
    return apiClient.post("/availabilities", payload);
  },

  update(id, payload) {
    return apiClient.put(`/availabilities/${id}`, payload);
  },

  remove(id) {
    return apiClient.delete(`/availabilities/${id}`);
  },
};

