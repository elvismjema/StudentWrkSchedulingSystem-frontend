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
};

export default AdminServices;
