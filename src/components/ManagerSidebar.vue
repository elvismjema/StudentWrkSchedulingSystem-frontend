<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="manager-sidebar"
    width="256"
    rail-width="60"
  >

    <div class="logo-section">
      <div class="logo-container">
        <div class="oc-logo">OC</div>
        <div v-if="!rail" class="logo-text">
          <div class="main-title">{{ bannerTitle }}</div>
        </div>
      </div>
    </div>

    <v-divider />

    <v-list nav class="nav-list">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.route"
        class="nav-item"
        active-class="active-nav-item"
      >
        <template #prepend>
          <v-icon :icon="item.icon" size="20" />
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>

      <!-- Admin-only section -->
      <template v-if="isAdmin">
        <v-divider class="section-divider" />
        <div v-if="!rail" class="section-label">
          Admin
        </div>
        <v-list-item
          v-for="item in adminNavItems"
          :key="item.title"
          :to="item.route"
          class="nav-item"
          active-class="active-nav-item"
        >
          <template #prepend>
            <v-icon :icon="item.icon" size="20" />
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </template>
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
            <div class="user-role">{{ displayRole }}</div>
          </div>
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import Utils from "../config/utils";
import UserRoleServices from "../services/userRoleServices";

const drawer = ref(true);
const rail = ref(true);
const user = ref(Utils.getStore("user") || {});

const displayName = computed(() => {
  const first = user.value?.fName || "";
  const last = user.value?.lName || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "User";
});

const displayRole = computed(() => {
  const role = (user.value?.role || "").toLowerCase();
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Student";
});

const displayDepartment = computed(() => {
  const context = Utils.getStore("currentDepartmentContext");
  if (context?.department_name) return context.department_name;
  const membershipDepartment = user.value?.userDepartments?.[0]?.department?.department_name;
  return membershipDepartment || user.value?.department_name || "Department";
});

const bannerTitle = computed(() => displayDepartment.value);

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || "";
  const last = user.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
});

const isAdmin = computed(() => {
  return (user.value?.role || "").toLowerCase() === "admin";
});

const navItems = [
  { title: "Dashboard", icon: "mdi-view-grid-outline", route: "/manager/dashboard" },
  { title: "Schedule", icon: "mdi-calendar-month-outline", route: "/manager/schedule" },
  { title: "Templates", icon: "mdi-text-box-multiple-outline", route: "/manager/templates" },
  { title: "Approvals", icon: "mdi-checkbox-marked-outline", route: "/manager/approvals" },
  { title: "Time & Pay", icon: "mdi-clock-outline", route: "/manager/time-pay" },
  { title: "Student Workers", icon: "mdi-account-group-outline", route: "/manager/workers" }
];

const adminNavItems = [
  { title: "Manage Users", icon: "mdi-account-cog", route: "/manager/admin/users" },
  { title: "Manage Departments", icon: "mdi-office-building-cog", route: "/manager/admin/departments" },
];

// Initialise department context on mount so every manager view has a valid
// department_id in localStorage.  Skipped when already present.
onMounted(async () => {
  const existing = Utils.getStore("currentDepartmentContext");
  if (existing?.department_id) return;

  const userId = user.value?.userId || user.value?.id;
  if (!userId) return;

  try {
    const response = await UserRoleServices.getUserDepartments(userId);
    const memberships = response?.data || [];
    // Prefer an active manager-level membership, fall back to any active one.
    const managerMembership = memberships.find(
      (m) => m.is_active && (m.role?.permission_level || 0) >= 50
    );
    const membership =
      managerMembership ||
      memberships.find((m) => m.is_active) ||
      memberships[0];
    if (!membership) return;

    const ctx = {
      department_id: membership.department_id,
      department_name: membership.department?.department_name,
      role_name: membership.role?.role_name || "Manager",
      role_id: membership.role_id,
    };
    Utils.setStore("currentDepartmentContext", ctx);
    // Notify other components (e.g. ScheduleTemplates) on the same tab
    window.dispatchEvent(new CustomEvent("departmentContextReady", { detail: ctx }));
  } catch {
    // Non-fatal: context will just remain unset.
  }
});

defineExpose({
  rail,
  toggleRail: () => {
    rail.value = !rail.value;
  }
});
</script>

<style scoped>
.manager-sidebar {
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
  background-color: #8B1538;
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

.brand-title {
  font-size: 19px;
  font-weight: 700;
  color: #1f2328;
}

.brand-subtitle {
  font-size: 14px;
  color: #667085;
}

.manager-nav {
  padding: 8px 12px;
}

.manager-nav-item {
  border-radius: 12px;
  min-height: 66px;
}

.manager-active-nav-item {
  background: #f0f6ff;
  color: #0969da;
}

.manager-user-wrap {
  padding: 8px 12px;
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

.section-divider {
  margin: 8px 12px;
}

.section-label {
  padding: 0 16px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8B1538;
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
