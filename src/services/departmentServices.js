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

const DepartmentServices = {
  // Get all departments
  getDepartments() {
    return apiClient.get("/departments");
  },

  // Get single department by ID
  getDepartment(id) {
    return apiClient.get(`/departments/${id}`);
  },

  // Create new department
  createDepartment(data) {
    return apiClient.post("/departments", data);
  },

  // Update department settings
  updateDepartment(id, data) {
    return apiClient.put(`/departments/${id}`, data);
  },

  // Delete department
  deleteDepartment(id) {
    return apiClient.delete(`/departments/${id}`);
  },

  // Get department hours
  getDepartmentHours(departmentId) {
    return apiClient.get(`/department-hours?department_id=${departmentId}`);
  },

  // Create department hours
  createDepartmentHours(data) {
    return apiClient.post("/department-hours", data);
  },

  // Update department hours
  updateDepartmentHours(id, data) {
    return apiClient.put(`/department-hours/${id}`, data);
  },

  // Delete department hours
  deleteDepartmentHours(id) {
    return apiClient.delete(`/department-hours/${id}`);
  },
};

export default DepartmentServices;
