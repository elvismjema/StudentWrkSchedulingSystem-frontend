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
      <v-tooltip
        v-for="item in navItems"
        :key="item.title"
        :text="item.title"
        :disabled="!rail"
        location="end"
      >
        <template #activator="{ props: tooltipProps }">
          <v-list-item
            v-bind="tooltipProps"
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
      </v-tooltip>

      <!-- Admin-only section -->
      <template v-if="isAdmin">
        <v-divider class="section-divider" />
        <div v-if="!rail" class="section-label">
          Admin
        </div>
        <v-tooltip
          v-for="item in adminNavItems"
          :key="item.title"
          :text="item.title"
          :disabled="!rail"
          location="end"
        >
          <template #activator="{ props: tooltipProps }">
            <v-list-item
              v-bind="tooltipProps"
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
        </v-tooltip>
      </template>
    </v-list>

  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import Utils from "../config/utils";
import UserRoleServices from "../services/userRoleServices";

const drawer = ref(true);
const rail = ref(true);
const user = ref(Utils.getStore("user") || {});

const displayDepartment = computed(() => {
  const context = Utils.getStore("currentDepartmentContext");
  if (context?.department_name) return context.department_name;
  const membershipDepartment = user.value?.userDepartments?.[0]?.department?.department_name;
  return membershipDepartment || user.value?.department_name || "Department";
});

const bannerTitle = computed(() => displayDepartment.value);

const isAdmin = computed(() => {
  return (user.value?.role || "").toLowerCase() === "admin";
});

const navItems = [
  { title: "Dashboard", icon: "mdi-view-grid-outline", route: "/manager/dashboard" },
  { title: "Schedule", icon: "mdi-calendar-month-outline", route: "/manager/schedule" },
  { title: "Templates", icon: "mdi-text-box-multiple-outline", route: "/manager/templates" },
  { title: "Approvals", icon: "mdi-checkbox-marked-outline", route: "/manager/approvals" },
  { title: "Time & Pay", icon: "mdi-clock-outline", route: "/manager/time-pay" },
  { title: "Student Workers", icon: "mdi-account-group-outline", route: "/manager/workers" },
  { title: "Task Lists", icon: "mdi-clipboard-list-outline", route: "/manager/task-lists" },
  { title: "Settings", icon: "mdi-cog-outline", route: "/manager/settings" }
];

const adminNavItems = [
  { title: "Manage Users", icon: "mdi-account-cog", route: "/manager/admin/users" },
  { title: "Manage Departments", icon: "mdi-office-building-cog", route: "/manager/admin/departments" },
];

const toggleRail = () => {
  rail.value = !rail.value;
};

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
  toggleRail,
});
</script>

<style scoped>
.manager-sidebar {
  border-right: 1px solid var(--border-1);
}

.logo-section {
  padding: 14px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.oc-logo {
  background-color: var(--brand-primary);
  color: var(--surface-0);
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
  margin: 2px var(--space-1);
  border-radius: var(--radius-sm);
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

.section-divider {
  margin: var(--space-1) var(--space-2);
}

.section-label {
  padding: 0 var(--space-3) 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-primary);
}

.rail-toggle-wrap {
  padding: var(--space-1);
  display: flex;
  justify-content: flex-end;
}

.rail-toggle-btn {
  color: var(--text-2);
  text-transform: none;
  font-size: 13px;
  letter-spacing: normal;
  min-width: 0;
}

.rail-toggle-btn:hover {
  color: var(--brand-primary);
  background-color: var(--surface-2);
}

.rail-toggle-label {
  margin-left: 6px;
}

.user-section {
  padding: 6px;
}

.user-item {
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);
}

.user-avatar {
  background-color: var(--brand-primary);
}

.user-initial {
  color: var(--surface-0);
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

.v-navigation-drawer--rail .rail-toggle-wrap {
  justify-content: center;
}
</style>
