<template>
  <v-app-bar
    elevation="0"
    height="60"
    class="top-nav"
    color="white"
  >
    <!-- Left side - Menu toggle -->
    <v-btn
      icon
      variant="text"
      @click="toggleSidebar"
      class="menu-btn"
    >
      <v-icon size="24">mdi-menu</v-icon>
    </v-btn>

    <v-spacer></v-spacer>

    <!-- Right side - Notifications and User -->
    <div class="nav-actions">
      <v-tooltip text="My Tasks" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            class="tasks-btn"
            @click="goToTasks"
          >
            <v-icon size="24">mdi-clipboard-text-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <!-- Notifications -->
      <NotificationDropdown @notification-click="handleNotificationClick" />

      <!-- User Avatar with Dropdown -->
      <v-menu
        v-model="menuOpen"
        :close-on-content-click="false"
        location="bottom end"
        offset="8"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            class="user-menu-btn"
          >
            <v-avatar size="34" class="nav-user-avatar">
              <span class="nav-user-initial">{{ displayInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="264">
          <!-- Header Section -->
          <div class="profile-header">
            <v-avatar size="44" class="header-avatar">
              <span class="header-initial">{{ displayInitial }}</span>
            </v-avatar>
            <div class="header-info">
              <div class="header-name">{{ displayName }}</div>
              <div class="header-email">{{ displayEmail }}</div>
            </div>
          </div>

          <v-divider></v-divider>

          <!-- Menu Items -->
          <v-list>
            <v-list-item
              v-for="item in menuItems"
              :key="item.title"
              :to="item.route"
              @click="menuOpen = false"
              class="menu-item"
            >
              <template v-slot:prepend>
                <v-icon :icon="item.icon" size="20"></v-icon>
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider></v-divider>

          <!-- Sign Out -->
          <v-list>
            <v-list-item
              @click="handleSignOut"
              class="sign-out-item"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-logout" size="20" color="error"></v-icon>
              </template>
              <v-list-item-title class="sign-out-text">Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Utils from '../config/utils'
import NotificationDropdown from './NotificationDropdown.vue'

const emit = defineEmits(['toggle-sidebar'])
const router = useRouter()
const menuOpen = ref(false)
const user = ref(Utils.getStore("user") || {})

const displayName = computed(() => {
  const first = user.value?.fName || ''
  const last = user.value?.lName || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || 'User'
})

const displayEmail = computed(() => user.value?.email || '')

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || ''
  const last = user.value?.lName?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
})

const menuItems = [
  { title: 'Profile', icon: 'mdi-account', route: '/student/profile' }
]

const toggleSidebar = () => {
  emit('toggle-sidebar')
}

const goToTasks = () => {
  router.push('/student/tasks')
}

const handleSignOut = () => {
  menuOpen.value = false
  Utils.removeItem('user')
  router.push('/login')
}

const handleNotificationClick = (notification) => {
  // Handle notification click logic here
  console.log('Notification clicked:', notification)
}
</script>

<style scoped>
.top-nav {
  border-bottom: 1px solid var(--border-1);
  padding: 0 12px;
}

.menu-btn {
  margin-right: 8px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-btn {
  margin-right: 8px;
}

.tasks-btn {
  color: var(--text-2);
}

.nav-user-avatar {
  background-color: var(--brand-primary);
}

.nav-user-initial {
  color: white;
  font-weight: 500;
  font-size: 14px;
}

/* Button hover effects */
.menu-btn:hover,
.tasks-btn:hover,
.notification-btn:hover,
.user-menu-btn:hover {
  background-color: var(--surface-2);
}

/* Profile Menu Styles */
.profile-menu {
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.profile-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  background-color: var(--brand-primary);
}

.header-initial {
  color: white;
  font-weight: 500;
  font-size: 16px;
}

.header-info {
  flex: 1;
}

.header-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.2;
}

.header-email {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.2;
  margin-top: 2px;
}

.menu-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.menu-item :deep(.v-list-item-title),
.sign-out-item :deep(.v-list-item-title) {
  font-size: 14px;
}

.menu-item:hover {
  background-color: var(--surface-2);
}

.sign-out-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.sign-out-item:hover {
  background-color: var(--state-alert-lt);
}

.sign-out-text {
  color: var(--state-alert);
  font-weight: 500;
}
</style>
