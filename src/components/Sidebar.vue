<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="sidebar"
    width="256"
    rail-width="60"
  >
    <!-- Logo Section -->
    <div class="logo-section">
      <div class="logo-container">
        <div class="oc-logo">
          OC
        </div>
        <div v-if="!rail" class="logo-text">
          <div class="main-title">Oklahoma Christian</div>
          <div class="sub-title">Student Worker Scheduling</div>
        </div>
      </div>
    </div>

    <v-divider></v-divider>

    <!-- Navigation Items -->
    <v-list nav class="nav-list">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.route"
        active-class="active-nav-item"
        class="nav-item"
      >
        <template v-slot:prepend>
          <v-icon :icon="item.icon" size="20"></v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>

    <template v-slot:append>
      <v-divider></v-divider>
      <div class="user-section">
        <v-list-item class="user-item">
          <template v-slot:prepend>
            <v-avatar size="32" class="user-avatar">
              <span class="user-initial">{{ displayInitial }}</span>
            </v-avatar>
          </template>
          <div v-if="!rail" class="user-info">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-role">{{ displayRole }}</div>
          </div>
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import Utils from '../config/utils'

const drawer = ref(true)
const rail = ref(false)
const user = ref(Utils.getStore("user") || {})

const displayName = computed(() => {
  const first = user.value?.fName || ''
  const last = user.value?.lName || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || 'User'
})

const displayRole = computed(() => {
  const role = (user.value?.role || 'student').toLowerCase()
  return role === 'manager' ? 'Manager' : 'Student'
})

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || ''
  const last = user.value?.lName?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
})

const navItems = [
  { title: 'My Schedule', icon: 'mdi-home', route: '/student/schedule' },
  { title: 'Availability', icon: 'mdi-calendar', route: '/student/availability' },
  { title: 'Trade Board', icon: 'mdi-swap-horizontal', route: '/student/trade-board' },
  { title: 'Clock In/Out', icon: 'mdi-clock', route: '/student/clock' },
  { title: 'Notifications', icon: 'mdi-bell', route: '/student/notifications' }
]

defineExpose({
  rail,
  toggleRail: () => { rail.value = !rail.value }
})
</script>

<style scoped>
.sidebar {
  border-right: 1px solid #e0e0e0;
}

.logo-section {
  padding: 14px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.oc-logo {
  background-color: #8B1538; /* OC Maroon */
  color: white;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 15px;
  border-radius: 4px;
  flex-shrink: 0;
}

.logo-text {
  flex: 1;
}

.main-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.sub-title {
  font-size: 11px;
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}

.nav-list {
  padding: 6px 0;
}

.nav-item {
  margin: 2px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-item :deep(.v-list-item__content) {
  font-size: 14px;
}

.nav-item :deep(.v-list-item-title) {
  font-size: 14px;
}

.nav-item:hover {
  background-color: #f5f5f5;
}

.active-nav-item {
  background-color: #f8e6ea !important; /* Light maroon/pink background */
  color: #8B1538 !important; /* OC Maroon */
}

.active-nav-item .v-icon {
  color: #8B1538 !important;
}

.active-nav-item .v-list-item-title {
  color: #8B1538 !important;
  font-weight: 500;
}

.user-section {
  padding: 6px;
}

.user-item {
  border-radius: 8px;
  margin: 0 8px;
}

.user-avatar {
  background-color: #8B1538;
}

.user-initial {
  color: white;
  font-weight: 500;
  font-size: 13px;
}

.user-name {
  color: #333;
  font-size: 13px;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-role {
  color: #666;
  font-size: 11px;
  margin-top: 2px;
}

/* Rail mode adjustments */
.v-navigation-drawer--rail .logo-section {
  padding: 16px 8px;
}

.v-navigation-drawer--rail .logo-container {
  justify-content: center;
}

.v-navigation-drawer--rail .nav-item {
  margin: 2px 4px;
}

.v-navigation-drawer--rail .user-item {
  margin: 0 4px;
}
</style>
