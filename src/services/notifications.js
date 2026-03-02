import apiClient from "./services.js";
import Utils from "../config/utils.js";

const iconForTitle = (title = "") => {
  const normalized = String(title).toLowerCase();
  if (normalized.includes("reminder")) return "mdi-bell-ring-outline";
  if (normalized.includes("cancel")) return "mdi-calendar-remove-outline";
  if (normalized.includes("change")) return "mdi-calendar-edit-outline";
  if (normalized.includes("publish") || normalized.includes("assign")) {
    return "mdi-calendar-check-outline";
  }
  return "mdi-bell-outline";
};

const toUiNotification = (item) => ({
  id: item.id,
  title: item.title,
  description: item.message,
  timestamp: new Date(item.createdAt || item.updatedAt || Date.now()).toLocaleString(),
  unread: !item.isRead,
  icon: iconForTitle(item.title),
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
}

export default NotificationService;
