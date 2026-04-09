import apiClient from "./services.js";
import Utils from "../config/utils.js";
import { formatDateTime } from "../utils/tz.js";

const iconForType = (type = "", title = "") => {
  switch (type) {
    case "shift_assignment":   return "mdi-calendar-check-outline";
    case "shift_change":       return "mdi-calendar-edit-outline";
    case "shift_cancellation": return "mdi-calendar-remove-outline";
    case "shift_reassignment": return "mdi-account-switch-outline";
    case "shift_reminder":     return "mdi-bell-ring-outline";
    case "coverage_gap":       return "mdi-alert-circle-outline";
    default: break;
  }
  // Fallback: derive from title keywords (backwards-compatible)
  const normalized = String(title).toLowerCase();
  if (normalized.includes("reminder"))           return "mdi-bell-ring-outline";
  if (normalized.includes("cancel"))             return "mdi-calendar-remove-outline";
  if (normalized.includes("change") || normalized.includes("updated")) return "mdi-calendar-edit-outline";
  if (normalized.includes("gap") || normalized.includes("coverage")) return "mdi-alert-circle-outline";
  if (normalized.includes("publish") || normalized.includes("assign")) return "mdi-calendar-check-outline";
  return "mdi-bell-outline";
};

const toUiNotification = (item) => ({
  id: item.id,
  title: item.title,
  description: item.message,
  timestamp: formatDateTime(new Date(item.createdAt || item.updatedAt || Date.now())),
  unread: !item.isRead,
  icon: iconForType(item.type, item.title),
  // US1 AC3, US3 AC3 – deep-link path stored on the notification record
  link: item.link || null,
  // Used by the UI to render high-priority gap alerts differently
  priority: item.priority || "normal",
  type: item.type || null,
});

const getCurrentUserId = () => Utils.getStore("user")?.userId;

class NotificationService {
  static async getNotifications() {
    const userId = getCurrentUserId();
    const response = await apiClient.get("/notifications", {
      params: userId ? { userId } : {},
    });
    const payload = response?.data?.data || [];
    return payload.map(toUiNotification);
  }

  static async getUnreadCount() {
    const notifications = await this.getNotifications();
    return notifications.filter((item) => item.unread).length;
  }

  static async markAllAsRead() {
    const notifications = await this.getNotifications();
    const unread = notifications.filter((item) => item.unread);
    await Promise.all(unread.map((item) => this.markAsRead(item.id)));
    return true;
  }

  static async markAsRead(notificationId) {
    await apiClient.patch(`/notifications/${notificationId}/read`, {});
    return true;
  }

  /**
   * Bulk-publish multiple shifts in one request.
   * Triggers consolidated notifications per student and per manager (gap alerts).
   * US1 AC4, US3 AC4
   *
   * @param {number[]} shiftIds - array of shift IDs to publish
   */
  static async bulkPublishShifts(shiftIds) {
    const response = await apiClient.post("/shifts/bulk-publish", { shiftIds });
    return response?.data;
  }
}

export default NotificationService;
