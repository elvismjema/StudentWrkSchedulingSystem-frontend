<template>
  <v-app>
    <!-- Sidebar navigation -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      class="sidebar"
      width="220"
      rail-width="64"
    >
      <!-- Logo Section -->
      <div class="logo-section">
        <div class="logo-container">
          <v-btn
            icon
            variant="text"
            size="small"
            @click="rail = !rail"
            aria-label="Toggle sidebar"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>
          <div v-if="!rail" class="logo-text">
            <div class="main-title">{{ departmentName }}</div>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Navigation Items -->
      <v-list nav class="nav-list">
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :to="item.route"
          :active="isActiveRoute(item)"
          active-class="active-nav-item"
          class="nav-item"
        >
          <template #prepend>
            <v-icon :icon="item.icon" size="20" />
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <v-divider />
        <div class="user-section">
          <v-list-item class="user-item">
            <template #prepend>
              <v-avatar size="32" class="user-avatar">
                <span class="user-initial">{{ displayInitial }}</span>
              </v-avatar>
            </template>
            <div v-if="!rail" class="user-info">
              <div class="user-name">{{ displayName }}</div>
              <div class="user-role">Student</div>
            </div>
          </v-list-item>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Top navigation bar -->
    <v-app-bar flat class="top-bar" density="compact">
      <v-app-bar-title class="text-body-1 font-weight-medium">
        {{ departmentName }}
      </v-app-bar-title>
      <v-spacer />
      <v-btn icon variant="text" @click="$router.push({ name: 'student-notifications' })">
        <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error" overlap>
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
      <v-avatar size="32" class="ml-2 user-avatar-top">
        <span class="user-initial-top">{{ displayInitial }}</span>
      </v-avatar>
    </v-app-bar>

    <!-- Main content area -->
    <v-main class="main-content">
      <v-container fluid class="student-content pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Utils from '../config/utils.js';
import UserRoleServices from '../services/userRoleServices.js';
import studentService from '../services/studentService.js';

const route = useRoute();
const drawer = ref(true);
const rail = ref(false);
const user = ref(Utils.getStore('user') || {});
const resolvedDepartmentName = ref('');
const unreadCount = ref(0);

const displayName = computed(() => {
  const first = user.value?.fName || '';
  const last = user.value?.lName || '';
  return `${first} ${last}`.trim() || 'Student';
});

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || '';
  const last = user.value?.lName?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'S';
});

const departmentName = computed(() => {
  if (resolvedDepartmentName.value) return resolvedDepartmentName.value;
  const context = Utils.getStore('currentDepartmentContext');
  if (context?.department_name) return context.department_name;
  const membershipDept = user.value?.userDepartments?.[0]?.department?.department_name;
  return membershipDept || user.value?.department_name || 'OC WorkSchedule';
});

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/student/dashboard', name: 'student-dashboard' },
  { title: 'My Schedule', icon: 'mdi-calendar-clock', route: '/student/schedule', name: 'student-schedule' },
  { title: 'Clock In/Out', icon: 'mdi-clock-check-outline', route: '/student/clock', name: 'student-clock' },
  { title: 'Trade Board', icon: 'mdi-swap-horizontal', route: '/student/trade-board', name: 'student-trade-board' },
  { title: 'Notifications', icon: 'mdi-bell-outline', route: '/student/notifications', name: 'student-notifications' },
  { title: 'Availability', icon: 'mdi-calendar-edit', route: '/student/availability', name: 'student-availability' },
  { title: 'Settings', icon: 'mdi-cog-outline', route: '/student/settings', name: 'student-settings' },
];

const isActiveRoute = (item) => {
  return route.name === item.name || route.path === item.route;
};

onMounted(async () => {
  // Load department name
  const context = Utils.getStore('currentDepartmentContext');
  if (context?.department_name) {
    resolvedDepartmentName.value = context.department_name;
  } else {
    const userId = user.value?.userId || user.value?.id;
    if (userId) {
      try {
        const response = await UserRoleServices.getUserDepartments(userId);
        const memberships = response?.data || [];
        const active = memberships.find((m) => m.is_active) || memberships[0];
        if (active?.department?.department_name) {
          resolvedDepartmentName.value = active.department.department_name;
          Utils.setStore('currentDepartmentContext', {
            department_id: active.department_id,
            department_name: active.department.department_name,
            role_name: active.role?.role_name || 'Student',
            role_id: active.role_id,
          });
        }
      } catch {
        // fallback to defaults
      }
    }
  }

  // Load unread notification count
  try {
    const res = await studentService.getUnreadNotificationCount();
    const notifs = res?.data?.data || res?.data || [];
    unreadCount.value = Array.isArray(notifs) ? notifs.filter((n) => !n.isRead).length : 0;
  } catch {
    // ignore
  }
});
</script>

<style scoped>
.sidebar {
  border-right: 1px solid #e0e0e0;
  background: #fff;
}

.logo-section {
  padding: 12px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  flex: 1;
}

.main-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
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
  background-color: #f8e6ea !important;
  color: #8B1538 !important;
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

.top-bar {
  border-bottom: 1px solid #e0e0e0;
}

.user-avatar-top {
  background-color: #8B1538;
}

.user-initial-top {
  color: white;
  font-weight: 500;
  font-size: 12px;
}

.main-content {
  background-color: #fafafa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.student-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Rail mode adjustments */
.v-navigation-drawer--rail .logo-section {
  padding: 14px 8px;
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
