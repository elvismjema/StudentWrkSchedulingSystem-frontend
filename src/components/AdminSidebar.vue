<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="admin-sidebar"
    width="290"
    rail-width="68"
  >
    <div class="brand-wrap">
      <div class="brand-row">
        <div class="oc-badge">OC</div>
        <div v-if="!rail" class="brand-text">
          <div class="brand-title">Oklahoma Christian</div>
          <div class="brand-subtitle">System Administration</div>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Department Switcher -->
    <div class="px-3 py-3">
      <DepartmentSwitcher />
    </div>

    <v-divider />

    <v-list nav class="admin-nav">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.route"
        class="admin-nav-item"
        active-class="admin-active-nav-item"
      >
        <template #prepend>
          <v-icon :icon="item.icon" size="22" />
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider />
      <div class="admin-user-wrap">
        <v-list-item class="admin-user-item">
          <template #prepend>
            <v-avatar size="38" class="admin-user-avatar">
              <span class="admin-user-initial">{{ displayInitial }}</span>
            </v-avatar>
          </template>
          <div v-if="!rail" class="admin-user-text">
            <div class="admin-user-name">{{ displayName }}</div>
            <div class="admin-user-role">{{ displayRole }}</div>
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
  return fullName || "Admin";
});

const displayRole = computed(() => {
  const context = Utils.getStore("currentDepartmentContext");
  return context?.role_name || "Administrator";
});

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || "";
  const last = user.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "A";
});

const navItems = [
  { title: "Dashboard", icon: "mdi-view-dashboard", route: "/admin/dashboard" },
  { title: "User Management", icon: "mdi-account-multiple", route: "/admin/users" },
  { title: "Departments", icon: "mdi-office-building", route: "/admin/departments" },
  { title: "Reports", icon: "mdi-chart-box", route: "/admin/reports" },
  { title: "System Settings", icon: "mdi-cog", route: "/admin/settings" }
];

defineExpose({
  rail,
  toggleRail: () => {
    rail.value = !rail.value;
  }
});
</script>

<style scoped>
.admin-sidebar {
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
  background: #b71c1c;
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

.admin-nav {
  padding: 12px 0;
}

.admin-nav-item {
  border-radius: 10px;
  margin: 2px 8px;
  padding: 0 12px;
  min-height: 46px;
  color: #475467;
  font-weight: 500;
  font-size: 15px;
}

.admin-nav-item:hover {
  background: #f9fafb;
}

.admin-active-nav-item {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: #ffffff !important;
}

.admin-active-nav-item :deep(.v-icon) {
  color: #ffffff !important;
}

.admin-user-wrap {
  padding: 12px 14px;
}

.admin-user-item {
  padding: 0;
  min-height: auto;
}

.admin-user-avatar {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.admin-user-initial {
  font-size: 16px;
  font-weight: 600;
}

.admin-user-text {
  margin-left: 12px;
}

.admin-user-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2328;
  line-height: 1.2;
}

.admin-user-role {
  font-size: 13px;
  color: #667085;
  margin-top: 2px;
}
</style>
