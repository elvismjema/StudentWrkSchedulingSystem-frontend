import apiClient from "./services.js";

export default {
  listForUser(userId) {
    return apiClient.get(`/shift-acknowledgements/user/${userId}`);
  },

  acknowledge(id) {
    return apiClient.patch(`/shift-acknowledgements/${id}/acknowledge`, {});
  },
};

