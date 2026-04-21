<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="admin-sidebar"
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
    </v-list>

    <template #append>
      <v-divider />
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref } from "vue";
import Utils from "../config/utils";
const drawer = ref(true);
const rail = ref(true);
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

const bannerTitle = computed(() => "Admin");

const displayInitial = computed(() => {
  const first = user.value?.fName?.[0] || "";
  const last = user.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "A";
});

const navItems = [
  { title: "Dashboard", icon: "mdi-view-dashboard", route: "/admin/dashboard" },
  { title: "User Management", icon: "mdi-account-multiple", route: "/admin/users" },
  { title: "Departments", icon: "mdi-office-building", route: "/admin/departments" }
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

.brand-title {
  font-size: 19px;
  font-weight: 700;
  color: var(--text-1);
}

.brand-subtitle {
  font-size: 14px;
  color: var(--text-2);
}

.admin-nav {
  padding: 8px 12px;
}

.admin-nav-item {
  border-radius: 12px;
  min-height: 66px;
}

.admin-active-nav-item {
  background: var(--state-info-lt);
  color: var(--state-info);
}

.admin-user-wrap {
  padding: 8px 12px;
}

.admin-user-item {
  border-radius: 12px;
  min-height: 66px;
}

.admin-user-avatar {
  /* TODO: audit color intent — this distinct red marks the admin avatar and
     does not map cleanly to state-alert (--state-alert is warmer, less
     saturated). Left as-is pending a design decision. */
  background: #b71c1c;
}

.admin-user-initial {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.admin-user-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-user-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.admin-user-role {
  font-size: 14px;
  color: var(--text-2);
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
