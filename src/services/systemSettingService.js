import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("system-settings");
  },

  update(id, value) {
    return apiClient.put(`system-settings/${id}`, { value });
  },

  bulkUpdate(updates) {
    return apiClient.put("system-settings", updates);
  },
};
