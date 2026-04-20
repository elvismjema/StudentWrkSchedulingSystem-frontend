import apiClient from "./services.js";

const shiftTaskCompletionService = {
  getShiftCompletions(shiftId) {
    return apiClient.get(`/shift-task-completions/${shiftId}`);
  },

  completeTask(shiftId, taskListItemId) {
    return apiClient.post("/shift-task-completions", {
      shift_id: shiftId,
      task_list_item_id: taskListItemId,
    });
  },

  uncompleteTask(shiftId, taskListItemId) {
    return apiClient.delete(`/shift-task-completions/${shiftId}/${taskListItemId}`);
  },
};

export default shiftTaskCompletionService;
