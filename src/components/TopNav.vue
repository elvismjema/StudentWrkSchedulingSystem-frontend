<template>
  <v-app-bar
    elevation="0"
    height="64"
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
      <!-- Notifications -->
      <v-btn
        icon
        variant="text"
        class="notification-btn"
      >
        <v-icon size="24">mdi-bell</v-icon>
      </v-btn>

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
            <v-avatar size="36" class="nav-user-avatar">
              <span class="nav-user-initial">{{ displayInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="280">
          <!-- Header Section -->
          <div class="profile-header">
            <v-avatar size="48" class="header-avatar">
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
                <v-icon icon="mdi-logout" size="20" color="#d32f2f"></v-icon>
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
  { title: 'Profile', icon: 'mdi-account', route: '/student/profile' },
  { title: 'Settings', icon: 'mdi-cog', route: '/student/settings' }
]

const toggleSidebar = () => {
  emit('toggle-sidebar')
}

const handleSignOut = () => {
  menuOpen.value = false
  Utils.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.top-nav {
  border-bottom: 1px solid #e0e0e0;
  padding: 0 16px;
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

.nav-user-avatar {
  background-color: #8B1538; /* OC Maroon */
}

.nav-user-initial {
  color: white;
  font-weight: 500;
  font-size: 16px;
}

/* Button hover effects */
.menu-btn:hover,
.notification-btn:hover,
.user-menu-btn:hover {
  background-color: #f5f5f5;
}

/* Profile Menu Styles */
.profile-menu {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.profile-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  background-color: #8B1538;
}

.header-initial {
  color: white;
  font-weight: 500;
  font-size: 18px;
}

.header-info {
  flex: 1;
}

.header-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.header-email {
  font-size: 14px;
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}

.menu-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.sign-out-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.sign-out-item:hover {
  background-color: #ffebee;
}

.sign-out-text {
  color: #d32f2f;
  font-weight: 500;
}
</style>
