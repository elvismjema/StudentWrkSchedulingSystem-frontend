import apiClient from "./services.js";

const taskListService = {
  listTaskLists(params = {}) {
    return apiClient.get("/task-lists", { params });
  },

  getTaskList(id) {
    return apiClient.get(`/task-lists/${id}`);
  },

  createTaskList(data) {
    return apiClient.post("/task-lists", data);
  },

  updateTaskList(id, data) {
    return apiClient.put(`/task-lists/${id}`, data);
  },

  deleteTaskList(id) {
    return apiClient.delete(`/task-lists/${id}`);
  },
};

export default taskListService;
