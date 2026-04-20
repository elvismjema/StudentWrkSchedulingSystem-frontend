<template>
  <v-app-bar
    elevation="0"
    height="60"
    class="manager-top-bar"
    color="surface-0"
  >
    <v-btn
      icon
      variant="text"
      class="menu-btn"
      aria-label="Toggle sidebar"
      @click="emit('toggle-sidebar')"
    >
      <v-icon icon="mdi-menu" size="24" />
    </v-btn>

    <v-spacer />

    <div class="top-actions">
      <v-chip
        v-if="departmentName && !isAdmin"
        size="small"
        variant="flat"
        color="brandPrimaryLt"
        class="department-chip"
        label
      >
        <v-icon size="14" start>mdi-office-building-outline</v-icon>
        {{ departmentName }}
      </v-chip>

      <NotificationDropdown
        v-if="!isAdmin"
        @notification-click="handleNotificationClick"
      />

      <v-menu
        v-model="menuOpen"
        :close-on-content-click="false"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" class="user-menu-btn">
            <v-avatar size="34" class="profile-avatar">
              <span class="profile-initials">{{ displayInitials }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="264">
          <div class="profile-header">
            <v-avatar size="44" class="header-avatar">
              <span class="header-initials">{{ displayInitials }}</span>
            </v-avatar>
            <div class="header-info">
              <div class="header-name">{{ displayName }}</div>
              <div class="header-email">{{ displayEmail }}</div>
            </div>
          </div>

          <v-divider />

          <v-list v-if="menuItems.length">
            <v-list-item
              v-for="item in menuItems"
              :key="item.title"
              :to="item.route"
              class="menu-item"
              @click="menuOpen = false"
            >
              <template #prepend>
                <v-icon :icon="item.icon" size="20" />
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider />

          <v-list>
            <v-list-item class="sign-out-item" @click="handleSignOut">
              <template #prepend>
                <v-icon icon="mdi-logout" size="20" color="error" />
              </template>
              <v-list-item-title class="sign-out-text">Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<script>
export default {
  name: "ManagerTopBar",
};
</script>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import NotificationDropdown from "./NotificationDropdown.vue";

const emit = defineEmits(["toggle-sidebar"]);
const router = useRouter();
const menuOpen = ref(false);
const user = ref(Utils.getStore("user") || {});

const displayName = computed(() => {
  const first = user.value?.fName || "";
  const last = user.value?.lName || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "User";
});

const displayEmail = computed(() => user.value?.email || "");

const displayInitials = computed(() => {
  const first = user.value?.fName?.[0] || "";
  const last = user.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
});

const userRole = computed(() => (user.value?.role || "").toLowerCase());
const isAdmin = computed(() => userRole.value === "admin");

const departmentName = computed(() => {
  const ctx = Utils.getStore("currentDepartmentContext");
  return ctx?.department_name || "";
});

const menuItems = computed(() => {
  if (isAdmin.value) {
    return [];
  }
  return [
    { title: "Profile", icon: "mdi-account", route: "/manager/profile" },
    { title: "Settings", icon: "mdi-cog-outline", route: "/manager/settings" },
  ];
});

const handleSignOut = () => {
  menuOpen.value = false;
  Utils.removeItem("user");
  router.push("/login");
};

const handleNotificationClick = (notification) => {
  // Reserved for future routing based on notification type.
  console.log("Manager notification clicked:", notification);
};

const toggleSidebar = () => {
  emit('toggle-sidebar');
};
</script>

<style scoped>
.manager-top-bar {
  border-bottom: 1px solid var(--border-1);
  padding: 0 var(--space-2);
}

.hamburger-btn {
  margin-right: var(--space-2);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.department-chip {
  font-weight: 500;
  color: var(--brand-primary);
}

.profile-avatar {
  background: var(--brand-primary);
}

.profile-initials {
  color: var(--surface-0);
  font-size: 14px;
  font-weight: 500;
}

.user-menu-btn:hover {
  background-color: var(--surface-2);
}

.profile-menu {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-2);
}

.profile-header {
  padding: var(--space-3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  background: var(--brand-primary);
}

.header-initials {
  color: var(--surface-0);
  font-size: 16px;
  font-weight: 600;
}

.header-info {
  flex: 1;
}

.header-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.2;
}

.header-email {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.2;
  margin-top: 2px;
}

.menu-item {
  margin: 0 var(--space-1);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: var(--surface-2);
}

.menu-item :deep(.v-list-item-title),
.sign-out-item :deep(.v-list-item-title) {
  font-size: 14px;
}

.sign-out-item {
  margin: 0 var(--space-1);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.sign-out-item:hover {
  background-color: var(--state-alert-lt);
}

.sign-out-text {
  color: var(--state-alert);
  font-weight: 500;
}
</style>
