<script setup>
/**
 * StudentMobile.vue
 *
 * Mobile-first student layout with:
 *   - Compact top bar (page title + notifications + avatar)
 *   - Full-width content area
 *   - Bottom navigation bar (5 tabs)
 *   - Safe area handling for iPhone notch/home indicator
 *   - Page transitions between routes
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import { studentMobileTabs, studentMobileRouteOrder } from '../config/studentMobileNavigation.js';
import UserRoleServices from '../services/userRoleServices.js';
import NotificationDropdown from '../components/NotificationDropdown.vue';
import NotificationService from '../services/notifications.js';
import studentService from '../services/studentService.js';

const route = useRoute();
const router = useRouter();
const user = ref(Utils.getStore('user') || {});
const resolvedDepartmentName = ref('');
const menuOpen = ref(false);
const unreadNotifications = ref(0);
const isClockedIn = ref(false);
let notifPollTimer = null;

// ─── User display ───
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

// ─── Page title based on current route ───
const pageTitle = computed(() => {
  return route.meta?.mobileTitle || resolvedDepartmentName.value || 'OC WorkSchedule';
});

// ─── Bottom nav ───
const activeTab = computed(() => {
  return route.meta?.mobileTab ?? null;
});

const navigateTab = (tab) => {
  if (tab?.routeName && route.name !== tab.routeName) {
    router.push({ name: tab.routeName });
  }
};

// ─── Transition direction ───
const transitionName = ref('fade');

watch(
  () => route.name,
  (to, from) => {
    const toIdx = studentMobileRouteOrder.indexOf(to);
    const fromIdx = studentMobileRouteOrder.indexOf(from);
    if (toIdx < 0 || fromIdx < 0) {
      transitionName.value = 'fade';
    } else {
      transitionName.value = toIdx > fromIdx ? 'slide-left' : 'slide-right';
    }
  }
);

// ─── Notification badge count ───
async function fetchUnreadCount() {
  try {
    const notifications = await NotificationService.getNotifications();
    unreadNotifications.value = notifications.filter(n => n.unread).length;
  } catch {
    // silent
  }
}

// ─── Clock status for pulse ───
async function fetchClockStatus() {
  try {
    const res = await studentService.getOpenClockRecord();
    const record = res?.data?.data || res?.data;
    isClockedIn.value = !!(record && !record.clock_out && !record.clock_out_time);
  } catch {
    isClockedIn.value = false;
  }
}

// ─── Department name ───
onMounted(async () => {
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
        // fallback silently
      }
    }
  }

  fetchUnreadCount();
  fetchClockStatus();
  // Poll notifications every 60s
  notifPollTimer = setInterval(fetchUnreadCount, 60000);
});

onUnmounted(() => {
  if (notifPollTimer) clearInterval(notifPollTimer);
});

const handleSignOut = () => {
  menuOpen.value = false;
  Utils.removeItem('user');
  router.push('/login');
};
</script>

<template>
  <div class="mobile-app">
    <!-- ═══ Mobile Top Bar ═══ -->
    <div class="mobile-top-bar">
      <div class="mobile-top-bar-title">{{ pageTitle }}</div>
      <div class="mobile-top-bar-actions">
        <NotificationDropdown />
        <v-menu
          v-model="menuOpen"
          :close-on-content-click="false"
          location="bottom end"
          offset="8"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" size="small" class="ml-1">
              <v-avatar size="30" class="mobile-avatar">
                <span class="mobile-avatar-text">{{ displayInitial }}</span>
              </v-avatar>
            </v-btn>
          </template>

          <v-card class="profile-menu" min-width="240" rounded="lg">
            <div class="profile-header">
              <v-avatar size="40" class="profile-header-avatar">
                <span class="profile-header-initial">{{ displayInitial }}</span>
              </v-avatar>
              <div class="profile-header-info">
                <div class="profile-header-name">{{ displayName }}</div>
                <div class="profile-header-email">{{ displayEmail }}</div>
              </div>
            </div>
            <v-divider />
            <v-list density="compact" nav>
              <v-list-item @click="handleSignOut">
                <template #prepend><v-icon icon="mdi-logout" size="18" color="#d32f2f" /></template>
                <v-list-item-title class="text-error">Sign out</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </div>

    <!-- ═══ Content Area ═══ -->
    <div class="mobile-main">
      <div class="mobile-content">
        <router-view v-slot="{ Component }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>

    <!-- ═══ Bottom Navigation ═══ -->
    <nav class="mobile-bottom-nav">
      <button
        v-for="tab in studentMobileTabs"
        :key="tab.key"
        :class="['nav-tab', { 'nav-tab--active': activeTab === tab.key }]"
        @click="navigateTab(tab)"
      >
        <!-- Center Clock In button -->
        <template v-if="tab.isCenter">
          <div :class="['clock-icon-wrapper', { 'clock-pulse': !isClockedIn }]">
            <v-icon icon="mdi-clock-check-outline" size="24" color="white" />
          </div>
        </template>

        <!-- Regular tab with optional badge -->
        <template v-else>
          <div class="nav-icon-wrap">
            <v-icon :icon="activeTab === tab.key ? tab.icon : tab.iconOutline" size="24" />
            <span
              v-if="tab.hasBadge && unreadNotifications > 0"
              class="nav-badge"
            >{{ unreadNotifications > 9 ? '9+' : unreadNotifications }}</span>
          </div>
        </template>

        <span :class="['nav-label', { 'clock-label': tab.isCenter }]">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* ─── Layout ─── */
.mobile-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: #fafafa;
}

/* ─── Top Bar ─── */
.mobile-top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: calc(56px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 12px 0 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.mobile-top-bar-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-top-bar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.mobile-avatar {
  background-color: #80162B;
}

.mobile-avatar-text {
  color: white;
  font-weight: 600;
  font-size: 12px;
}

/* ─── Content ─── */
.mobile-main {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-content {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
}

/* ─── Bottom Navigation ─── */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  padding-top: 6px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: #ffffff;
  border-top: 1px solid #e8e8e8;
  box-shadow: 0 -1px 12px rgba(0, 0, 0, 0.06);
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  color: #999;
  transition: color 0.15s ease;
}

.nav-tab--active {
  color: #80162B;
}

.nav-tab--active .nav-label {
  color: #80162B;
  font-weight: 600;
}

.nav-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.nav-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #EE5044;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  margin-top: 3px;
  color: inherit;
}

/* ─── Clock In center button (accent) ─── */
.clock-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: #80162B;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -14px;
  box-shadow: 0 2px 8px rgba(128, 22, 43, 0.3);
}

.clock-label {
  color: #80162B;
  font-weight: 600;
}

/* Subtle pulse when user is NOT clocked in — draws attention */
.clock-pulse {
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(128, 22, 43, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(128, 22, 43, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(128, 22, 43, 0);
  }
}



/* ─── Profile dropdown ─── */
.profile-menu {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.profile-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-header-avatar {
  background-color: #80162B;
}

.profile-header-initial {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.profile-header-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.profile-header-email {
  font-size: 12px;
  color: #666;
}

/* ─── Page Transitions ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
