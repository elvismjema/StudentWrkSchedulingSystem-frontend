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
 * 'More' is the catch-all hub for everything else (Tasks, Notifications,
 * Departments, Qualifications, Profile, Settings). Anything that doesn't
 * earn one of the four primary tabs lives behind More — do not add new
 * primary tabs to make a feature more discoverable.
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
    key: 'tasks',
    label: 'Tasks',
    description: 'Assigned tasks & to-dos',
    icon: 'mdi-checkbox-marked-outline',
    color: 'blue',
    routeName: 'student-tasks',
    title: 'Tasks',
    tab: null,
    order: 5,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Alerts & messages',
    icon: 'mdi-bell-outline',
    color: 'yellow',
    routeName: 'student-notifications',
    title: 'Notifications',
    tab: null,
    order: 6,
  },
  {
    key: 'departments',
    label: 'Departments',
    description: 'Your departments',
    icon: 'mdi-office-building',
    color: 'darkblue',
    routeName: 'student-departments',
    title: 'Departments',
    tab: null,
    order: 7,
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    description: 'Skills & certifications',
    icon: 'mdi-certificate',
    color: 'teal',
    routeName: 'student-qualifications',
    title: 'Qualifications',
    tab: null,
    order: 8,
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your account info',
    icon: 'mdi-account',
    color: 'primary',
    routeName: 'student-profile',
    title: 'Profile',
    tab: null,
    order: 9,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Preferences & config',
    icon: 'mdi-cog',
    color: 'text-2',
    routeName: 'student-settings',
    title: 'Settings',
    tab: null,
    order: 10,
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
