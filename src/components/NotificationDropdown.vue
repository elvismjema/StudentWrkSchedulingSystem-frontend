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
          :content="unreadCount"
          :color="unreadCount > 0 ? 'error' : 'transparent'"
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
          <div class="notification-indicator" v-if="notification.unread">
            <div class="unread-dot"></div>
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
          View All Notifications
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NotificationService from '../services/notifications'
import Utils from '../config/utils'

const emit = defineEmits(['notification-click'])
const router = useRouter()
const currentUser = Utils.getStore("user") || {}

const isOpen = ref(false)
const notifications = ref([])

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
  emit('notification-click', notification)
  isOpen.value = false
}

const handleViewAll = () => {
  const role = String(currentUser.role || "").toLowerCase()
  const destination = role === "manager" || role === "admin"
    ? "/manager/notifications"
    : "/student/notifications"
  router.push(destination)
  isOpen.value = false
}

onMounted(() => {
  loadNotifications()
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
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  padding: 2px 8px;
  border-radius: 12px;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
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

.no-notifications {
  padding: 32px 16px;
  text-align: center;
  color: #666;
}

.no-notifications p {
  margin: 12px 0 0 0;
  font-size: 14px;
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
