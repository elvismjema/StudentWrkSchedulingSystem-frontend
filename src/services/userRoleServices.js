import apiClient from "./services.js";

const UserRoleServices = {
  // Admin: Get all users with their roles
  getAllUsersWithRoles(activeOnly = false) {
    const params = activeOnly ? { activeOnly: true } : {};
    return apiClient.get("/user-departments/admin/users-with-roles", { params });
  },

  deactivateUser(userId, removeFutureShifts = false) {
    return apiClient.patch(`/users/${userId}/deactivate`, {
      remove_future_shifts: removeFutureShifts,
    });
  },

  // Admin: Assign or update user role
  assignUserRole(data) {
    return apiClient.post("/user-departments/admin/assign-role", data);
  },

  // Admin: Remove user role from department
  removeUserRole(udId) {
    return apiClient.delete(`/user-departments/admin/remove-role/${udId}`);
  },

  // Get user's active roles across all departments
  getUserRoles(userId) {
    return apiClient.get(`/user-departments/roles/${userId}`);
  },

  // Get user departments
  getUserDepartments(userId) {
    return apiClient.get(`/user-departments/user/${userId}`);
  },

  // Get all roles
  getAllRoles(departmentId = null) {
    const url = departmentId
      ? `/roles?department_id=${departmentId}`
      : "/roles";
    return apiClient.get(url);
  },
};

export default UserRoleServices;
