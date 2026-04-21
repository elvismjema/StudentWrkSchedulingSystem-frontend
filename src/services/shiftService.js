import apiClient from "./services.js";

export default {
  // Get all shifts with optional filters
  listShifts(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.assigned_user_id) params.append('assigned_user_id', filters.assigned_user_id);
    if (filters.is_published !== undefined) params.append('is_published', filters.is_published);
    if (filters.shift_date) params.append('shift_date', filters.shift_date);
    
    return apiClient.get(`shifts?${params.toString()}`);
  },

  // Get a single shift by ID
  getShiftById(id) {
    return apiClient.get(`shifts/${id}`);
  },

  // Create a new shift
  createShift(shiftData) {
    return apiClient.post('shifts', shiftData);
  },

  // Update an existing shift
  updateShift(id, shiftData) {
    return apiClient.put(`shifts/${id}`, shiftData);
  },

  // Delete a shift
  deleteShift(id) {
    return apiClient.delete(`shifts/${id}`);
  },

  // Preview shifts based on template
  previewShifts(previewData) {
    return apiClient.post('shifts/preview', previewData);
  },

  // Assign user to shift (this might be handled by updateShift)
  assignUserToShift(shiftId, userId) {
    return this.updateShift(shiftId, { assigned_user_id: userId });
  },

  // Get workers who can be assigned for a specific shift window
  getAssignableWorkers(params = {}) {
    const query = new URLSearchParams();
    if (params.department_id) query.append('department_id', params.department_id);
    if (params.position_id) query.append('position_id', params.position_id);
    if (params.shift_date) query.append('shift_date', params.shift_date);
    if (params.start_time) query.append('start_time', params.start_time);
    if (params.end_time) query.append('end_time', params.end_time);
    if (params.exclude_shift_id) query.append('exclude_shift_id', params.exclude_shift_id);

    return apiClient.get(`shifts/assignable-workers?${query.toString()}`);
  },

  // Remove user assignment from shift
  removeUserAssignment(shiftId) {
    return this.updateShift(shiftId, { assigned_user_id: null });
  }
};
