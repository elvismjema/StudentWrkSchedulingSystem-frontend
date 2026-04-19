<template>
  <v-menu
    v-model="isOpen"
    :close-on-content-click="false"
    location="bottom end"
    offset="8"
    min-width="320"
    max-width="400"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        class="notification-btn"
      >
        <v-badge
          :model-value="unreadCount > 0"
          :content="unreadCount > 99 ? '99+' : unreadCount"
          color="error"
          floating
          offset-x="8"
          offset-y="8"
        >
          <v-icon size="24">mdi-bell</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card class="notification-dropdown" rounded="lg">
      <!-- Header -->
      <div class="dropdown-header">
        <div class="header-title">
          <h3>Notifications</h3>
          <span class="unread-count" v-if="unreadCount > 0">
            {{ unreadCount }} unread
          </span>
        </div>
        <div class="header-actions">
          <v-btn
            variant="text"
            size="small"
            color="primary"
            class="mark-all-read-btn"
            @click="handleMarkAllAsRead"
            :loading="markingAllAsRead"
            v-if="unreadCount > 0"
          >
            Mark all as read
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            color="error"
            class="clear-all-btn"
            @click="handleClearAllNotifications"
            :loading="clearingAll"
            v-if="notifications.length > 0"
          >
            Clear all
          </v-btn>
        </div>
      </div>

      <v-divider></v-divider>

      <!-- Notifications List -->
      <div class="notifications-list" v-if="notifications.length > 0">
        <div
          v-for="notification in notifications.slice(0, 5)"
          :key="notification.id"
          class="notification-item"
          :class="{ 'unread': notification.unread }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <v-icon :icon="notification.icon" size="20"></v-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-time">{{ notification.timestamp }}</div>
          </div>
          <div class="notification-actions">
            <div class="notification-indicator" v-if="notification.unread">
              <div class="unread-dot"></div>
            </div>
            <v-btn
              icon
              size="x-small"
              variant="text"
              color="grey-lighten-1"
              class="delete-btn"
              @click.stop="handleDeleteNotification(notification)"
            >
              <v-icon size="16">mdi-close</v-icon>
            </v-btn>
          </div>
        </div>
      </div>

      <div v-else class="no-notifications">
        <v-icon size="48" color="grey-lighten-1">mdi-bell-outline</v-icon>
        <p>No notifications</p>
      </div>

      <v-divider></v-divider>

      <!-- Footer -->
      <div class="dropdown-footer">
        <v-btn
          variant="text"
          color="primary"
          class="view-all-btn"
          @click="handleViewAll"
        >
          View all notifications
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import NotificationService from '../services/notifications'
import Utils from '../config/utils'
import { resolveNotificationLink, isExternalNotificationLink } from '../utils/notificationLinks'

const emit = defineEmits(['notification-click'])
const router = useRouter()
const currentUser = Utils.getStore("user") || {}
const currentRole = String(currentUser.role || '').toLowerCase()

const isOpen = ref(false)
const notifications = ref([])
const markingAllAsRead = ref(false)
const clearingAll = ref(false)

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

const handleNotificationClick = async (notification) => {
  if (notification.unread) {
    try {
      await NotificationService.markAsRead(notification.id)
      notification.unread = false
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
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

  emit('notification-click', notification)
  isOpen.value = false
}

const handleDeleteNotification = async (notification) => {
  try {
    await NotificationService.deleteNotification(notification.id)
    // Remove notification from list
    const index = notifications.value.findIndex(n => n.id === notification.id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  } catch (error) {
    console.error('Error deleting notification:', error)
  }
}

const handleClearAllNotifications = async () => {
  clearingAll.value = true
  try {
    await NotificationService.clearAllNotifications()
    // Clear all notifications from list
    notifications.value = []
  } catch (error) {
    console.error('Error clearing all notifications:', error)
  } finally {
    clearingAll.value = false
  }
}

const handleMarkAllAsRead = async () => {
  markingAllAsRead.value = true
  try {
    await NotificationService.markAllAsRead()
    // Update all notifications to marked as read
    notifications.value.forEach(notification => {
      notification.unread = false
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  } finally {
    markingAllAsRead.value = false
  }
}

const handleViewAll = () => {
  const role = String(currentUser.role || "").toLowerCase()
  const destination = role === "manager" || role === "admin"
    ? "/manager/notifications"
    : "/student/notifications"
  router.push(destination)
  isOpen.value = false
}

// Poll for new notifications every 30 seconds so students get
// near-real-time updates when a manager approves/declines requests
let pollTimer = null

onMounted(() => {
  loadNotifications()
  pollTimer = setInterval(loadNotifications, 30_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.notification-btn {
  margin-right: 8px;
}

.notification-dropdown {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mark-all-read-btn {
  font-size: 12px;
  font-weight: 500;
  min-width: auto;
}

.clear-all-btn {
  font-size: 12px;
  font-weight: 500;
  min-width: auto;
}

.header-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.unread-count {
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 12px;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #f0f7ff;
}

.notification-icon {
  margin-right: 12px;
  color: #666;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.3;
  margin-bottom: 2px;
}

.notification-time {
  font-size: 12px;
  color: #666;
  line-height: 1.2;
}

.notification-indicator {
  margin-left: 8px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #1976d2;
  border-radius: 50%;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.dropdown-footer {
  padding: 8px;
}

.view-all-btn {
  width: 100%;
  justify-content: center;
  font-weight: 500;
}
</style>
