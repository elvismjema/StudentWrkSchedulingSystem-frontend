<template>
  <v-app-bar elevation="0" height="60" class="manager-top-nav" color="white">
    <v-btn icon variant="text" class="panel-btn" @click="emit('toggle-sidebar')">
      <v-icon size="24">mdi-menu</v-icon>
    </v-btn>

    <v-spacer />

    <div class="top-actions">
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
              @click="menuOpen = false"
              class="menu-item"
            >
              <template #prepend>
                <v-icon :icon="item.icon" size="20" />
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
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
    </div>
  </v-app-bar>
</template>

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
  Utils.removeItem("currentDepartmentContext");
  Utils.removeItem("user");
  router.push("/login");
};

const handleNotificationClick = (notification) => {
  // Handle notification click logic here
  console.log('Manager notification clicked:', notification);
};
</script>

<style scoped>
.manager-top-nav {
  border-bottom: 1px solid #e0e0e0;
  padding: 0 12px;
}

.panel-btn {
  margin-right: 8px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-avatar {
  background: #8B1538;
}

.profile-initials {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.user-menu-btn:hover {
  background-color: #f5f5f5;
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
  background: #8B1538;
}

.header-initials {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.header-info {
  flex: 1;
}

.header-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.header-email {
  font-size: 13px;
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}

.menu-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item :deep(.v-list-item-title),
.sign-out-item :deep(.v-list-item-title) {
  font-size: 14px;
}

.sign-out-item {
  margin: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.sign-out-item:hover {
  background-color: #ffebee;
}

.sign-out-text {
  color: #d32f2f;
  font-weight: 500;
}
</style>
