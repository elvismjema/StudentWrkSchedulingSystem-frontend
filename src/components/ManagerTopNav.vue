<template>
  <v-app-bar elevation="0" height="76" class="manager-top-nav">
    <v-btn icon variant="text" class="panel-btn" @click="emit('toggle-sidebar')">
      <v-icon size="26">mdi-view-column-outline</v-icon>
    </v-btn>

    <v-spacer />

    <div class="top-actions">
      <v-badge content="1" color="error" floating offset-x="8" offset-y="8">
        <v-btn icon variant="text" class="notify-btn">
          <v-icon size="26">mdi-bell-outline</v-icon>
        </v-btn>
      </v-badge>

      <v-btn icon variant="text">
        <v-avatar size="52" class="profile-avatar">
          <span class="profile-initials">{{ displayInitials }}</span>
        </v-avatar>
      </v-btn>
    </div>
  </v-app-bar>
</template>

<script setup>
import { computed, ref } from "vue";
import Utils from "../config/utils";

const emit = defineEmits(["toggle-sidebar"]);
const user = ref(Utils.getStore("user") || {});

const displayInitials = computed(() => {
  const first = user.value?.fName?.[0] || "";
  const last = user.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
});
</script>

<style scoped>
.manager-top-nav {
  border-bottom: 1px solid #e3e5e8;
  padding: 0 16px;
  background: #ffffff;
}

.panel-btn,
.notify-btn {
  color: #1f2328;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  background: #930033;
}

.profile-initials {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
}
</style>
