/**
 * Unified Student Service
 * All student-facing API calls go through this single module.
 * Uses the shared axios instance from services.js for auth and base URL.
 */
import apiClient from "./services.js";
import Utils from "../config/utils.js";

const getUserId = () => {
  const user = Utils.getStore("user");
  return user?.userId || user?.id;
};

export default {
  // ─── Dashboard (aggregated) ──────────────────────────────────────
  getDashboard() {
    return apiClient.get("/student/dashboard");
  },

  // ─── Schedule ────────────────────────────────────────────────────
  getMySchedule(params = {}) {
    return apiClient.get("/student/my-schedule", { params });
  },

  getShifts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.assigned_user_id) params.append("assigned_user_id", filters.assigned_user_id);
    if (filters.start_date) params.append("start_date", filters.start_date);
    if (filters.end_date) params.append("end_date", filters.end_date);
    if (filters.is_published !== undefined) params.append("is_published", filters.is_published);
    return apiClient.get(`/shifts?${params.toString()}`);
  },

  getShiftById(id) {
    return apiClient.get(`/shifts/${id}`);
  },

  // ─── Open Shifts ─────────────────────────────────────────────────
  getOpenShifts(params = {}) {
    return apiClient.get("/student/open-shifts", { params });
  },

  claimOpenShift(shiftId) {
    return apiClient.post(`/student/open-shifts/${shiftId}/claim`);
  },

  // ─── Shift Swap / Find Cover ─────────────────────────────────────
  findCover(shiftId, data = {}) {
    return apiClient.post(`/student/shifts/${shiftId}/find-cover`, data);
  },

  requestSwap(shiftId, data) {
    return apiClient.post(`/student/shifts/${shiftId}/swap-request`, data);
  },

  getSwapRequests(params = {}) {
    return apiClient.get("/student/swap-requests", { params });
  },

  respondToSwap(requestId, data) {
    return apiClient.put(`/student/swap-requests/${requestId}`, data);
  },

  // ─── Time Off ────────────────────────────────────────────────────
  submitTimeOff(data) {
    return apiClient.post("/student/time-off", data);
  },

  getTimeOffRequests(params = {}) {
    return apiClient.get("/student/time-off", { params });
  },

  cancelTimeOff(requestId) {
    return apiClient.delete(`/student/time-off/${requestId}`);
  },

  // ─── Availability ────────────────────────────────────────────────
  getAvailability() {
    return apiClient.get("/student/availability");
  },

  updateAvailability(data) {
    return apiClient.put("/student/availability", data);
  },

  createAvailability(payload) {
    return apiClient.post("/availabilities", payload);
  },

  deleteAvailability(id) {
    return apiClient.delete(`/availabilities/${id}`);
  },

  // ─── Clock In/Out ────────────────────────────────────────────────
  clockIn(payload) {
    return apiClient.post("/clock-records/clock-in", payload);
  },

  clockOut(recordId) {
    return apiClient.patch(`/clock-records/${recordId}/clock-out`, {});
  },

  startBreak(recordId) {
    return apiClient.post("/student/break/start", { clockRecordId: recordId });
  },

  endBreak(recordId) {
    return apiClient.post("/student/break/end", { clockRecordId: recordId });
  },

  getOpenClockRecord() {
    return apiClient.get("/clock-records/me/open");
  },

  getClockRecords() {
    return apiClient.get("/clock-records/me");
  },

  getTimesheet(params = {}) {
    return apiClient.get("/student/timesheet", { params });
  },

  // ─── Notifications ───────────────────────────────────────────────
  getNotifications(params = {}) {
    const userId = getUserId();
    return apiClient.get("/notifications", {
      params: { userId, ...params },
    });
  },

  markNotificationRead(id) {
    return apiClient.patch(`/notifications/${id}/read`, {});
  },

  markAllNotificationsRead() {
    return apiClient.put("/student/notifications/read-all", {});
  },

  getUnreadNotificationCount() {
    const userId = getUserId();
    return apiClient.get("/notifications", {
      params: { userId, unread: true },
    });
  },

  // ─── Profile ─────────────────────────────────────────────────────
  getProfile() {
    const userId = getUserId();
    return apiClient.get("/student/profile", { params: { userId } });
  },

  updateProfile(data) {
    return apiClient.put("/student/profile", data);
  },

  // ─── Tasks ───────────────────────────────────────────────────────
  getTasks() {
    const userId = getUserId();
    return apiClient.get(`/shift-tasks/user/${userId}`);
  },

  completeTask(taskId) {
    return apiClient.patch(`/shift-tasks/${taskId}/complete`, {});
  },

  // ─── Shift Acknowledgements ──────────────────────────────────────
  getPendingAcknowledgements() {
    const userId = getUserId();
    return apiClient.get(`/shift-acknowledgements/user/${userId}`);
  },

  acknowledgeShift(acknowledgementId) {
    return apiClient.patch(`/shift-acknowledgements/${acknowledgementId}/acknowledge`, {});
  },

  // ─── Departments ─────────────────────────────────────────────────
  getUserDepartments() {
    const userId = getUserId();
    return apiClient.get(`/user-departments/user/${userId}`);
  },

  // ─── Coworkers ───────────────────────────────────────────────────
  getCoworkers(shiftId) {
    return apiClient.get(`/student/shifts/${shiftId}/coworkers`);
  },
};
