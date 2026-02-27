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

  // Remove user assignment from shift
  removeUserAssignment(shiftId) {
    return this.updateShift(shiftId, { assigned_user_id: null });
  }
};
