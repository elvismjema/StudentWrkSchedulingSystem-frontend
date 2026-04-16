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
  const titles = {
    'student-dashboard': 'Dashboard',
    'student-schedule': 'My Schedule',
    'student-clock': 'Clock In/Out',
    'student-trade-board': 'Trade Board',
    'student-availability': 'Availability',
    'student-tasks': 'Tasks',
    'student-notifications': 'Notifications',
    'student-departments': 'Departments',
    'student-qualifications': 'Qualifications',
    'student-profile': 'Profile',
    'student-settings': 'Settings',
    'student-more': 'More',
  };
  return titles[route.name] || resolvedDepartmentName.value || 'OC WorkSchedule';
});

// ─── Bottom nav ───
const activeTab = computed(() => {
  const name = route.name;
  // Map child routes back to their parent tab
  const moreRoutes = ['student-availability', 'student-tasks', 'student-notifications', 'student-departments', 'student-qualifications', 'student-profile', 'student-settings', 'student-more'];
  if (moreRoutes.includes(name)) return 'more';
  const tabMap = {
    'student-dashboard': 'dashboard',
    'student-schedule': 'schedule',
    'student-clock': 'clock',
    'student-trade-board': 'trade',
  };
  return tabMap[name] || 'dashboard';
});

const navigateTab = (tab) => {
  const routeMap = {
    dashboard: 'student-dashboard',
    schedule: 'student-schedule',
    clock: 'student-clock',
    trade: 'student-trade-board',
    more: 'student-more',
  };
  const target = routeMap[tab];
  if (target && route.name !== target) {
    router.push({ name: target });
  }
};

// ─── Transition direction ───
const transitionName = ref('fade');
const routeOrder = ['student-dashboard', 'student-schedule', 'student-clock', 'student-trade-board', 'student-more', 'student-availability', 'student-tasks', 'student-notifications', 'student-departments', 'student-qualifications', 'student-profile', 'student-settings'];

watch(
  () => route.name,
  (to, from) => {
    const toIdx = routeOrder.indexOf(to);
    const fromIdx = routeOrder.indexOf(from);
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
  <v-app class="mobile-app">
    <!-- ═══ Mobile Top Bar ═══ -->
    <v-app-bar
      flat
      density="compact"
      class="mobile-top-bar"
      height="56"
    >
      <v-app-bar-title class="text-body-1 font-weight-bold">
        {{ pageTitle }}
      </v-app-bar-title>

      <v-spacer />

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
          <v-list density="compact">
            <v-list-item :to="'/student/settings'" @click="menuOpen = false">
              <template #prepend><v-icon icon="mdi-cog-outline" size="18" /></template>
              <v-list-item-title>Settings</v-list-item-title>
            </v-list-item>
          </v-list>
          <v-divider />
          <v-list density="compact">
            <v-list-item @click="handleSignOut">
              <template #prepend><v-icon icon="mdi-logout" size="18" color="#d32f2f" /></template>
              <v-list-item-title class="text-error">Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ═══ Content Area ═══ -->
    <v-main class="mobile-main">
      <div class="mobile-content">
        <router-view v-slot="{ Component }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>

    <!-- ═══ Bottom Navigation ═══ -->
    <v-bottom-navigation
      :model-value="activeTab"
      grow
      class="mobile-bottom-nav"
      height="64"
      bg-color="white"
      elevation="8"
      :style="{ position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: 1000 }"
    >
      <v-btn value="dashboard" @click="navigateTab('dashboard')" class="nav-tab">
        <v-icon :icon="activeTab === 'dashboard' ? 'mdi-view-dashboard' : 'mdi-view-dashboard-outline'" />
        <span class="nav-label">Home</span>
      </v-btn>

      <v-btn value="schedule" @click="navigateTab('schedule')" class="nav-tab">
        <v-icon :icon="activeTab === 'schedule' ? 'mdi-calendar-clock' : 'mdi-calendar-clock-outline'" />
        <span class="nav-label">Schedule</span>
      </v-btn>

      <v-btn value="clock" @click="navigateTab('clock')" class="nav-tab clock-tab">
        <div :class="['clock-icon-wrapper', { 'clock-pulse': !isClockedIn }]">
          <v-icon icon="mdi-clock-check-outline" size="24" color="white" />
        </div>
        <span class="nav-label clock-label">Clock In</span>
      </v-btn>

      <v-btn value="trade" @click="navigateTab('trade')" class="nav-tab">
        <v-icon :icon="activeTab === 'trade' ? 'mdi-swap-horizontal-circle' : 'mdi-swap-horizontal-circle-outline'" />
        <span class="nav-label">Trade</span>
      </v-btn>

      <v-btn value="more" @click="navigateTab('more')" class="nav-tab">
        <v-badge
          :content="unreadNotifications"
          :model-value="unreadNotifications > 0"
          color="error"
          floating
          offset-x="-2"
          offset-y="2"
        >
          <v-icon :icon="activeTab === 'more' ? 'mdi-dots-horizontal-circle' : 'mdi-dots-horizontal-circle-outline'" />
        </v-badge>
        <span class="nav-label">More</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style scoped>
/* ─── Top Bar ─── */
.mobile-top-bar {
  border-bottom: 1px solid #eee;
  background: #fff !important;
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
  background: #fafafa;
}

.mobile-content {
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  min-height: calc(100vh - 56px);
}

/* ─── Bottom Navigation ─── */
.mobile-bottom-nav {
  border-top: 1px solid #eee;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 1000 !important;
}

.nav-tab {
  min-width: 0 !important;
}

.nav-tab .v-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  margin-top: 2px;
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

/* Active tab state */
.mobile-bottom-nav .v-btn--active .v-icon {
  color: #80162B;
}

.mobile-bottom-nav .v-btn--active .nav-label {
  color: #80162B;
  font-weight: 600;
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
