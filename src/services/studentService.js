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

// Normalize the many shapes an "open clock record" endpoint may return
// (backend sometimes wraps in { success, data, message }, sometimes
// returns the raw ClockRecord) into a single predictable shape for
// dashboard/clock views. Returns null when there is no genuinely open
// record so callers can treat it as "not clocked in" without any
// secondary checks.
//
// Note: the ClockRecord model does NOT have an `on_break` column — break
// state lives on the `breaks[]` association where an entry with
// `break_end === null` means on break. We therefore derive `onBreak`
// from that array and leave no stale `on_break` flag on the record.
const normalizeClockRecord = (record) => {
  if (!record) return null;

  const id = record.clock_id || record.id || record.clockRecordId;
  const clockIn = record.clock_in || record.clock_in_time || record.clockInTime || record.createdAt;
  const clockOut = record.clock_out || record.clock_out_time || record.clockOutTime || null;

  if (!id || !clockIn || clockOut) return null;

  const breaks = Array.isArray(record.breaks) ? record.breaks
    : Array.isArray(record.breakRecords) ? record.breakRecords
    : [];
  const onBreak = breaks.some((b) => b && !b.break_end && !b.break_end_time);

  return {
    ...record,
    id,
    clock_id: id,
    clock_in: clockIn,
    clock_in_time: clockIn,
    clock_out: null,
    clock_out_time: null,
    breaks,
    onBreak,
  };
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

  // ─── Cover Request / Swap Request ───────────────────────────────
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

  cancelSwapRequest(requestId) {
    return apiClient.delete(`/student/swap-requests/${requestId}`);
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
    const userId = getUserId();
    return apiClient.get(`/availabilities/user/${userId}`);
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
    return apiClient.post("/student/clock-in", payload);
  },

  clockOut(payload = {}) {
    return apiClient.post("/student/clock-out", payload);
  },

  startBreak(recordId) {
    return apiClient.post("/student/break/start", { clockRecordId: recordId });
  },

  endBreak(recordId) {
    return apiClient.post("/student/break/end", { clockRecordId: recordId });
  },

  getOpenClockRecord() {
    return apiClient.get("/clock-records/me/open").then((response) => ({
      ...response,
      data: {
        ...(response?.data || {}),
        data: normalizeClockRecord(response?.data?.data || response?.data),
      },
    }));
  },

  getClockRecords() {
    return apiClient.get("/clock-records/me");
  },

  getTimesheet(params = {}) {
    return apiClient.get("/student/timesheet", { params });
  },

  // ─── Notifications ───────────────────────────────────────────────
  getNotifications(params = {}) {
    return apiClient.get("/notifications", { params });
  },

  markNotificationRead(id) {
    return apiClient.patch(`/notifications/${id}/read`, {});
  },

  markAllNotificationsRead() {
    return apiClient.put("/student/notifications/read-all", {});
  },

  getUnreadNotificationCount() {
    return apiClient.get("/notifications", {
      params: { unread: true },
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
    return apiClient.get('/student/acknowledgements');
  },

  acknowledgeShift(acknowledgementId) {
    return apiClient.put(`/student/acknowledgements/${acknowledgementId}`, {});
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
