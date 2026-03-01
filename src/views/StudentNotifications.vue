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
        Mark All Read
      </v-btn>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list" v-if="notifications.length > 0">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-card"
        :class="{ 'unread': notification.unread }"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-icon">
          <v-icon :icon="notification.icon" size="24"></v-icon>
        </div>
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
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
import NotificationService from '../services/notifications'

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
    await NotificationService.markAsRead(notification.id)
    notification.unread = false
  }
  // Add additional logic for handling notification clicks
  console.log('Notification clicked:', notification)
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
  max-width: 800px;
  margin: 0 auto;
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
  gap: 12px;
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
  gap: 12px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.notification-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.notification-card.unread {
  background: #f8faff;
  border-color: #1976d2;
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
}

.notification-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.notification-time {
  font-size: 13px;
  color: #999;
  line-height: 1.2;
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
