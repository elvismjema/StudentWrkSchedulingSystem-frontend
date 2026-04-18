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
      <NotificationDropdown />
      <v-menu
        v-model="menuOpen"
        :close-on-content-click="false"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" class="ml-2">
            <v-avatar size="32" class="user-avatar-top">
              <span class="user-initial-top">{{ displayInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="264">
          <div class="profile-header">
            <v-avatar size="44" class="header-avatar">
              <span class="header-initial">{{ displayInitial }}</span>
            </v-avatar>
            <div class="header-info">
              <div class="header-name">{{ displayName }}</div>
              <div class="header-email">{{ displayEmail }}</div>
            </div>
          </div>

          <v-divider />

          <v-list>
            <v-list-item :to="'/student/profile'" @click="menuOpen = false" class="menu-item">
              <template #prepend>
                <v-icon icon="mdi-account" size="20" />
              </template>
              <v-list-item-title>Profile</v-list-item-title>
            </v-list-item>
            <v-list-item :to="'/student/settings'" @click="menuOpen = false" class="menu-item">
              <template #prepend>
                <v-icon icon="mdi-cog-outline" size="20" />
              </template>
              <v-list-item-title>Settings</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider />

          <v-list>
            <v-list-item @click="handleSignOut" class="sign-out-item">
              <template #prepend>
                <v-icon icon="mdi-logout" size="20" color="#d32f2f" />
              </template>
              <v-list-item-title class="sign-out-text">Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
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
import { useRoute, useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import UserRoleServices from '../services/userRoleServices.js';
import NotificationDropdown from '../components/NotificationDropdown.vue';

const route = useRoute();
const router = useRouter();
const drawer = ref(true);
const rail = ref(false);
const user = ref(Utils.getStore('user') || {});
const resolvedDepartmentName = ref('');
const menuOpen = ref(false);

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
const displayEmail = computed(() => user.value?.email || '');

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
  { title: 'Swap Board', icon: 'mdi-swap-horizontal', route: '/student/trade-board', name: 'student-trade-board' },
  { title: 'Availability', icon: 'mdi-calendar-edit', route: '/student/availability', name: 'student-availability' },
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

});

const handleSignOut = () => {
  menuOpen.value = false;
  Utils.removeItem('user');
  router.push('/login');
};
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
  background-color: #8B1538;
}

.header-initial {
  color: white;
  font-weight: 600;
}

.header-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.header-email {
  font-size: 13px;
  color: #666;
}

.menu-item {
  margin: 0 8px;
  border-radius: 8px;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.sign-out-item {
  margin: 0 8px;
  border-radius: 8px;
}

.sign-out-item:hover {
  background-color: #ffebee;
}

.sign-out-text {
  color: #d32f2f;
  font-weight: 500;
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
