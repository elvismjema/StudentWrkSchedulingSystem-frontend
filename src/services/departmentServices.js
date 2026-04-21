import apiClient from "./services.js";

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
