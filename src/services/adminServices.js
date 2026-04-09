import apiClient from "./services.js";

const AdminServices = {
  // ─── Users ─────────────────────────────────────────────────────────────────

  /** Get all users with their department role memberships */
  getAllUsers() {
    return apiClient.get("/admin/users");
  },

  /** Permanently delete a user from the database */
  deleteUser(userId) {
    return apiClient.delete(`/admin/users/${userId}`);
  },

  // ─── Pending Assignments ────────────────────────────────────────────────────

  /** List all unfulfilled pending role assignments */
  getPendingAssignments() {
    return apiClient.get("/admin/pending-assignments");
  },

  /**
   * Pre-provision a role for an email address.
   * If the user already exists they are assigned immediately;
   * otherwise the assignment is held until they first log in.
   */
  createPendingAssignment(data) {
    // data: { email, department_id, role_id, position_id? }
    return apiClient.post("/admin/pending-assignments", data);
  },

  /** Cancel / delete a pending assignment */
  deletePendingAssignment(id) {
    return apiClient.delete(`/admin/pending-assignments/${id}`);
  },

  // ─── Department Members ─────────────────────────────────────────────────────

  /** Get all active members of a specific department */
  getDepartmentMembers(departmentId) {
    return apiClient.get(`/admin/departments/${departmentId}/members`);
  },

  /**
   * Get roles for a specific department, excluding admin-level roles.
   * Used to populate the role dropdown in the Assign to Department dialog.
   */
  getDepartmentRoles(departmentId) {
    return apiClient.get(`/admin/departments/${departmentId}/roles`);
  },

  /**
   * Assign a manager or student worker to a single department.
   * Enforces the one-department rule: all existing non-admin memberships (and future
   * shifts in those departments) are removed before the new assignment is created.
   * Notifications are sent to the assigned user and (for students) to dept managers.
   */
  assignDepartment(data) {
    // data: { user_id, department_id, role_id, position_id? }
    return apiClient.post("/admin/assign-department", data);
  },

  promoteToAdmin(userId) {
    return apiClient.post(`/admin/users/${userId}/promote-to-admin`);
  },
};

export default AdminServices;
