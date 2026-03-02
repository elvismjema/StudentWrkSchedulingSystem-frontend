<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="manager-sidebar"
    width="290"
    rail-width="68"
  >
    <div class="brand-wrap">
      <div class="brand-row">
        <div class="oc-badge">OC</div>
        <div v-if="!rail" class="brand-text">
          <div class="brand-title">Oklahoma Christian</div>
          <div class="brand-subtitle">Student Worker Scheduling</div>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Department Switcher -->
    <div class="px-3 py-3">
      <DepartmentSwitcher />
    </div>

    <v-divider />

    <v-list nav class="manager-nav">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.route"
        class="manager-nav-item"
        active-class="manager-active-nav-item"
      >
        <template #prepend>
          <v-icon :icon="item.icon" size="22" />
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>

      <!-- Admin-only section -->
      <template v-if="isAdmin">
        <v-divider class="my-2 mx-3" />
        <div v-if="!rail" class="admin-section-label px-4 pb-1 text-caption text-uppercase font-weight-bold"
          style="color: #930033; letter-spacing: 0.08em;">
          Admin
        </div>
        <v-list-item
          v-for="item in adminNavItems"
          :key="item.title"
          :to="item.route"
          class="manager-nav-item"
          active-class="manager-active-nav-item"
        >
          <template #prepend>
            <v-icon :icon="item.icon" size="22" color="#930033" />
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <div class="manager-user-wrap">
        <v-list-item class="manager-user-item">
          <template #prepend>
            <v-avatar size="38" class="manager-user-avatar">
              <span class="manager-user-initial">{{ displayInitial }}</span>
            </v-avatar>
          </template>
          <div v-if="!rail" class="manager-user-text">
            <div class="manager-user-name">{{ displayName }}</div>
            <div class="manager-user-role">{{ displayRole }}</div>
          </div>
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref } from "vue";
import Utils from "../config/utils";
import DepartmentSwitcher from "./DepartmentSwitcher.vue";

const drawer = ref(true);
const rail = ref(false);
const user = ref(Utils.getStore("user") || {});

const displayName = computed(() => {
  const first = user.value?.fName || "";
  const last = user.value?.lName || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "User";
});

const displayRole = computed(() => {
  const role = (user.value?.role || "student").toLowerCase();
  if (role === "admin") return "Admin";
  return role === "manager" ? "Manager" : "Student";
});

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
  { title: "Create Shift", icon: "mdi-plus", route: "/manager/create-shift" },
  { title: "Availability", icon: "mdi-eye-outline", route: "/manager/availability" },
  { title: "Approvals", icon: "mdi-checkbox-marked-outline", route: "/manager/approvals" },
  { title: "Time & Attendance", icon: "mdi-clock-outline", route: "/manager/time-attendance" },
  { title: "Workers", icon: "mdi-account-group-outline", route: "/manager/workers" },
  { title: "Tasks", icon: "mdi-format-list-checks", route: "/manager/tasks" },
  { title: "Reports", icon: "mdi-chart-bar", route: "/manager/reports" },
  { title: "Notifications", icon: "mdi-bell-outline", route: "/manager/notifications" },
  { title: "Settings", icon: "mdi-cog-outline", route: "/manager/settings" }
];

const adminNavItems = [
  { title: "Manage Users", icon: "mdi-account-cog", route: "/manager/admin/users" },
  { title: "Manage Departments", icon: "mdi-office-building-cog", route: "/manager/admin/departments" },
];

defineExpose({
  rail,
  toggleRail: () => {
    rail.value = !rail.value;
  }
});
</script>

<style scoped>
.manager-sidebar {
  border-right: 1px solid #e3e5e8;
  background: #ffffff;
}

.brand-wrap {
  padding: 18px 14px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.oc-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #930033;
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.brand-title {
  font-size: 19px;
  font-weight: 700;
  color: #1f2328;
  line-height: 1.05;
}

.brand-subtitle {
  margin-top: 4px;
  font-size: 15px;
  color: #667085;
  line-height: 1.1;
}

.manager-nav {
  padding: 12px 0;
}

.manager-nav-item {
  margin: 3px 12px;
  border-radius: 12px;
  min-height: 48px;
}

.manager-nav-item:hover {
  background: #f7f7f8;
}

.manager-active-nav-item {
  background: #f8ecef !important;
  color: #930033 !important;
}

.manager-active-nav-item .v-icon,
.manager-active-nav-item .v-list-item-title {
  color: #930033 !important;
  font-weight: 600;
}

.manager-user-wrap {
  padding: 10px;
}

.manager-user-item {
  border-radius: 12px;
  min-height: 66px;
}

.manager-user-avatar {
  background: #930033;
}

.manager-user-initial {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.manager-user-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.manager-user-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
}

.manager-user-role {
  font-size: 14px;
  color: #667085;
}
</style>
