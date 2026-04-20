<template>
  <v-menu
    v-model="isOpen"
    :close-on-content-click="false"
    location="bottom end"
    offset="8"
    min-width="0"
    max-width="calc(100vw - 24px)"
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
        <div class="empty-icon-wrap">
          <v-icon size="28">mdi-bell-check-outline</v-icon>
        </div>
        <div class="empty-title">No notifications</div>
        <div class="empty-subtitle">You're all caught up.</div>
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
  width: min(360px, calc(100vw - 24px));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
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
  color: var(--text-1);
  margin: 0;
}

.unread-count {
  font-size: 13px;
  color: var(--text-2);
  background: var(--surface-2);
  padding: 4px 8px;
  border-radius: 12px;
}

.notifications-list {
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
  min-width: 0;
}

.notification-item:hover {
  background-color: var(--surface-1);
}

.notification-item.unread {
  background-color: var(--state-info-lt);
}

.notification-icon {
  margin-right: 12px;
  color: var(--text-2);
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
  color: var(--text-1);
  line-height: 1.3;
  margin-bottom: 2px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.notification-time {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.2;
  white-space: normal;
  overflow-wrap: anywhere;
}

.notification-indicator {
  margin-left: 8px;
  flex-shrink: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: var(--state-info);
  border-radius: 50%;
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.no-notifications {
  min-height: 128px;
  padding: 22px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.empty-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f8e6ea;
  color: #8B1538;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  color: #2f2f2f;
}

.empty-subtitle {
  max-width: 220px;
  font-size: 13px;
  line-height: 1.35;
  color: #6f6f6f;
}

.dropdown-footer {
  padding: 8px;
}

.view-all-btn {
  width: 100%;
  justify-content: center;
  font-weight: 500;
  min-height: 36px;
  white-space: normal;
  letter-spacing: 0.08em;
}

@media (max-width: 420px) {
  .notification-dropdown {
    width: calc(100vw - 16px);
  }

  .dropdown-header {
    padding: 14px;
  }

  .header-title h3 {
    font-size: 15px;
  }

  .no-notifications {
    min-height: 116px;
    padding: 18px 16px;
  }

  .view-all-btn {
    font-size: 12px;
    letter-spacing: 0.04em;
  }
}
</style>
