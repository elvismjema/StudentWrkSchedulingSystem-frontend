/**
 * studentMobileNavigation.js
 *
 * Single source of truth for the student mobile IA.
 *
 * Primary bottom nav: 5 tabs (HARD CAP — do not add a 6th)
 *   Home · Schedule · Clock (center) · Hours · More
 *
 * Swap/cover actions live inside Schedule on the individual shift cards
 * and on the Home dashboard as incoming-request cards, so a standalone
 * Swap Board tab is not needed.
 *
 * 'More' is the catch-all hub for everything else (Profile, Settings).
 * Anything that doesn't earn one of the four primary tabs
 * lives behind More — do not add new primary tabs to make a feature
 * more discoverable.
 *
 * Notifications are intentionally NOT in the More grid — the bell icon
 * in the top bar is the canonical entry point (per design doc:
 * 'notifications via bell in top bar'), and its dropdown already has a
 * 'View all notifications' link to the full page. Two entry points to
 * the same destination is noise.
 *
 * Visual rule (per PLAN-student-mobile-ui-spec): icons in the More hub
 * use a single restrained palette — brand maroon for the icon glyph on a
 * neutral surface. We do NOT rainbow-color each entry; the design doc is
 * explicit that 'if everything is brand-colored, nothing feels important'
 * and that maroon should guide focus, not paint the whole screen. Each
 * card is differentiated by its icon shape and label, not by hue.
 */

const studentMobilePrimaryTabs = [
  {
    key: 'dashboard',
    label: 'Home',
    routeName: 'student-dashboard',
    title: 'Dashboard',
    icon: 'mdi-home-variant',
    iconOutline: 'mdi-home-variant-outline',
    order: 0,
  },
  {
    key: 'schedule',
    label: 'Schedule',
    routeName: 'student-schedule',
    title: 'My Schedule',
    icon: 'mdi-calendar-week',
    iconOutline: 'mdi-calendar-week-outline',
    order: 1,
  },
  {
    key: 'clock',
    label: 'Clock',
    routeName: 'student-clock',
    title: 'Clock In / Out',
    icon: 'mdi-clock-outline',
    iconOutline: 'mdi-clock-outline',
    isCenter: true,
    order: 2,
  },
  {
    key: 'hours',
    label: 'Hours',
    routeName: 'student-availability',
    title: 'Hours',
    icon: 'mdi-calendar-edit',
    iconOutline: 'mdi-calendar-edit-outline',
    order: 3,
  },
  {
    key: 'more',
    label: 'More',
    routeName: 'student-more',
    title: 'More',
    icon: 'mdi-dots-horizontal',
    iconOutline: 'mdi-dots-horizontal',
    order: 4,
  },
];

export const studentMoreItems = [
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your account info',
    icon: 'mdi-account-circle-outline',
    routeName: 'student-profile',
    title: 'Profile',
    tab: null,
    order: 9,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Preferences & notifications',
    icon: 'mdi-cog-outline',
    routeName: 'student-settings',
    title: 'Settings',
    tab: null,
    order: 10,
  },
];

const studentHiddenRouteItems = [
  {
    key: 'tasks',
    routeName: 'student-tasks',
    title: 'Tasks',
    tab: null,
    order: 5,
  },
];

export const studentMobileTabs = studentMobilePrimaryTabs.map(({ routeName, title, order, ...tab }) => ({
  ...tab,
  routeName,
}));

const studentMobileRouteConfig = [
  ...studentMobilePrimaryTabs.map((tab) => ({
    routeName: tab.routeName,
    mobileTitle: tab.title,
    mobileTab: tab.key,
    mobileOrder: tab.order,
  })),
  ...studentMoreItems.map((item) => ({
    routeName: item.routeName,
    mobileTitle: item.title,
    mobileTab: item.tab,
    mobileOrder: item.order,
  })),
  ...studentHiddenRouteItems.map((item) => ({
    routeName: item.routeName,
    mobileTitle: item.title,
    mobileTab: item.tab,
    mobileOrder: item.order,
  })),
  // 'student-more' is now a primary bottom tab (see studentMobilePrimaryTabs
  // above), so it picks up its meta there. No standalone entry needed here.
];

export const studentMobileRouteOrder = studentMobileRouteConfig
  .slice()
  .sort((left, right) => left.mobileOrder - right.mobileOrder)
  .map((item) => item.routeName);

export const studentRouteMetaByName = Object.fromEntries(
  studentMobileRouteConfig.map((item) => [
    item.routeName,
    {
      mobileTitle: item.mobileTitle,
      mobileTab: item.mobileTab,
      mobileOrder: item.mobileOrder,
    },
  ])
);

export function getStudentMobileRouteMeta(routeName) {
  return studentRouteMetaByName[routeName] || {};
}
