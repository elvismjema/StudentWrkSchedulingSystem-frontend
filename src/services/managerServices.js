import apiClient from "./services.js";

export default {
  getOverview() {
    return apiClient.get("manager/overview");
  },
};
