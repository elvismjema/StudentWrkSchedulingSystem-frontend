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
          <div class="main-title">{{ bannerTitle }}</div>
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

import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import { computed, onMounted, ref } from 'vue'

import Utils from '../config/utils'
import UserRoleServices from '../services/userRoleServices.js'

const drawer = ref(true)

const rail = ref(false)
const route = useRoute()

const rail = ref(true)

const user = ref(Utils.getStore("user") || {})
const resolvedDepartmentName = ref('')

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

const bannerTitle = computed(() => {
  if (resolvedDepartmentName.value) return resolvedDepartmentName.value

  const context = Utils.getStore('currentDepartmentContext')
  if (context?.department_name) return context.department_name

  const membershipDepartment = user.value?.userDepartments?.[0]?.department?.department_name
  return membershipDepartment || user.value?.department_name || 'Department'
})

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || ''
  const last = user.value?.lName?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
})

const navItems = [
  { title: 'My Schedule', icon: 'mdi-home', route: '/student/schedule' },
  { title: 'Availability', icon: 'mdi-calendar', route: '/student/availability' },
  { title: 'Notifications', icon: 'mdi-bell', route: '/student/notifications' }
]

onMounted(async () => {
  const context = Utils.getStore('currentDepartmentContext')
  if (context?.department_name) {
    resolvedDepartmentName.value = context.department_name
    return
  }

  const userId = user.value?.userId || user.value?.id
  if (!userId) return

  try {
    const response = await UserRoleServices.getUserDepartments(userId)
    const memberships = response?.data || []
    const activeMembership = memberships.find((membership) => membership.is_active) || memberships[0]
    const departmentName = activeMembership?.department?.department_name
    if (!departmentName) return

    resolvedDepartmentName.value = departmentName
    Utils.setStore('currentDepartmentContext', {
      department_id: activeMembership.department_id,
      department_name: departmentName,
      role_name: activeMembership.role?.role_name || 'Student',
      role_id: activeMembership.role_id,
    })
  } catch (err) {
    // Keep existing fallback behavior when department context request fails.
  }
})

defineExpose({
  rail,
  toggleRail: () => { rail.value = !rail.value }
})
</script>

<style scoped>
.sidebar {
  border-right: 1px solid var(--border-1);
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
  background-color: var(--brand-primary);
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
  color: var(--text-1);
  line-height: 1.2;
}

.sub-title {
  font-size: 11px;
  color: var(--text-2);
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
  background-color: var(--surface-2);
}

.active-nav-item {
  background-color: var(--brand-primary-lt) !important;
  color: var(--brand-primary) !important;
}

.active-nav-item .v-icon {
  color: var(--brand-primary) !important;
}

.active-nav-item .v-list-item-title {
  color: var(--brand-primary) !important;
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
  background-color: var(--brand-primary);
}

.user-initial {
  color: white;
  font-weight: 500;
  font-size: 13px;
}

.user-name {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-role {
  color: var(--text-2);
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
