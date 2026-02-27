import axios from "axios";
import Utils from "../config/utils.js";

let baseurl = import.meta.env.VITE_API_BASE;
if (!baseurl) {
  if (import.meta.env.DEV) {
    baseurl = "http://localhost/workerscheduling-t2";
  } else {
    baseurl = "/workerscheduling-t2";
  }
}

const apiClient = axios.create({
  baseURL: baseurl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  transformRequest: (data, headers) => {
    let user = Utils.getStore("user");
    if (user != null) {
      let token = user.token;
      let authHeader = "";
      if (token != null && token != "") authHeader = "Bearer " + token;
      headers["Authorization"] = authHeader;
    }
    return JSON.stringify(data);
  },
});

const UserRoleServices = {
  // Admin: Get all users with their roles
  getAllUsersWithRoles() {
    return apiClient.get("/api/user-departments/admin/users-with-roles");
  },

  // Admin: Assign or update user role
  assignUserRole(data) {
    return apiClient.post("/api/user-departments/admin/assign-role", data);
  },

  // Admin: Remove user role from department
  removeUserRole(udId) {
    return apiClient.delete(`/api/user-departments/admin/remove-role/${udId}`);
  },

  // Get user's active roles across all departments
  getUserRoles(userId) {
    return apiClient.get(`/api/user-departments/roles/${userId}`);
  },

  // Get user departments
  getUserDepartments(userId) {
    return apiClient.get(`/api/user-departments/user/${userId}`);
  },

  // Get all roles
  getAllRoles(departmentId = null) {
    const url = departmentId
      ? `/api/roles?department_id=${departmentId}`
      : "/api/roles";
    return apiClient.get(url);
  },
};

export default UserRoleServices;
