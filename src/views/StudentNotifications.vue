<template>
  <div class="notifications-container">
    <!-- Header -->
    <div class="notifications-header">
      <div class="header-content">
        <h1>Notifications</h1>
        <div class="header-info">
          <span class="unread-count" v-if="unreadCount > 0">
            {{ unreadCount }} unread notifications
          </span>
        </div>
      </div>
      <v-btn
        v-if="unreadCount > 0"
        variant="outlined"
        color="primary"
        class="mark-all-btn"
        @click="handleMarkAllRead"
      >
        Mark all as read
      </v-btn>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list" v-if="notifications.length > 0">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-card"
        :class="{ 'unread': notification.unread, 'priority-high': notification.priority === 'high' }"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-icon" :class="{ 'icon-critical': notification.priority === 'high' }">
          <v-icon :icon="notification.icon" size="24"></v-icon>
        </div>
        <div class="notification-content">
          <div class="notification-title">
            {{ notification.title }}
            <v-chip
              v-if="notification.priority === 'high'"
              color="error"
              size="x-small"
              class="ml-2"
            >URGENT</v-chip>
          </div>
          <div class="notification-description">{{ notification.description }}</div>
          <div class="notification-time">{{ notification.timestamp }}</div>
        </div>
        <div class="notification-indicator" v-if="notification.unread">
          <div class="unread-dot"></div>
        </div>
      </div>
    </div>

    <div v-else class="no-notifications">
      <v-icon size="64" color="grey-lighten-1">mdi-bell-outline</v-icon>
      <h3>No Notifications</h3>
      <p>You're all caught up! Check back later for new notifications.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NotificationService from '../services/notifications'
import Utils from '../config/utils'
import { resolveNotificationLink, isExternalNotificationLink } from '../utils/notificationLinks'

const router = useRouter()
const notifications = ref([])
const currentRole = String(Utils.getStore('user')?.role || '').toLowerCase()

const unreadCount = computed(() => {
  return notifications.value.filter(n => n.unread).length
})

const loadNotifications = async () => {
  try {
    notifications.value = await NotificationService.getNotifications()
  } catch (error) {
    console.error('Error loading notifications:', error)
  }
}

/**
 * Mark the notification as read, then navigate to its deep-link if one exists.
 * US1 AC3, US3 AC3 – clicking a notification takes the user directly to the
 * relevant shift or schedule view.
 */
const handleNotificationClick = async (notification) => {
  if (notification.unread) {
    await NotificationService.markAsRead(notification.id)
    notification.unread = false
  }

  const targetLink = resolveNotificationLink(notification, currentRole)
  if (targetLink) {
    try {
      if (isExternalNotificationLink(targetLink)) {
        window.location.href = targetLink
      } else {
        await router.push(targetLink)
      }
    } catch {
      window.location.href = Utils.resolveAppUrl(targetLink)
    }
  }
}

const handleMarkAllRead = async () => {
  try {
    await NotificationService.markAllAsRead()
    notifications.value.forEach(notification => {
      notification.unread = false
    })
  } catch (error) {
    console.error('Error marking all as read:', error)
  }
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.notifications-container {
  padding: 24px;
  width: 100%;
  overflow-x: hidden;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-count {
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 16px;
}

.mark-all-btn {
  font-weight: 500;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 24px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.notification-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.notification-card.unread {
  background: #f8faff;
  border-color: #1976d2;
}

.notification-card.priority-high {
  background: #fff8f8;
  border-color: #d32f2f;
}

.icon-critical {
  color: #d32f2f !important;
}

.notification-icon {
  margin-right: 16px;
  margin-top: 2px;
  color: #666;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
  margin-bottom: 6px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.notification-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.notification-time {
  font-size: 13px;
  color: #999;
  line-height: 1.2;
  white-space: normal;
  overflow-wrap: anywhere;
}

.notification-indicator {
  margin-left: 12px;
  margin-top: 4px;
  flex-shrink: 0;
}

.unread-dot {
  width: 10px;
  height: 10px;
  background-color: #1976d2;
  border-radius: 50%;
}

.no-notifications {
  text-align: center;
  padding: 64px 24px;
  color: #666;
}

.no-notifications h3 {
  font-size: 20px;
  font-weight: 500;
  margin: 16px 0 8px 0;
  color: #333;
}

.no-notifications p {
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .notifications-container {
    padding: 16px;
  }
  
  .notifications-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .notification-card {
    padding: 16px;
  }
  
  .notification-title {
    font-size: 15px;
  }
  
  .notification-description {
    font-size: 13px;
  }
}
</style>
