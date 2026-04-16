/**
 * studentMobileNavigation.js
 *
 * Single source of truth for the student mobile IA.
 *
 * Primary bottom nav: 5 tabs
 *   Home · Schedule · Clock (center) · Trade · Hours
 *
 * Secondary pages are accessible via the profile/avatar menu in the
 * top bar — not promoted to a bottom tab.
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
    key: 'trade',
    label: 'Trade',
    routeName: 'student-trade-board',
    title: 'Trade Board',
    icon: 'mdi-swap-horizontal-circle',
    iconOutline: 'mdi-swap-horizontal-circle-outline',
    order: 3,
  },
  {
    key: 'hours',
    label: 'Hours',
    routeName: 'student-availability',
    title: 'Hours',
    icon: 'mdi-calendar-edit',
    iconOutline: 'mdi-calendar-edit-outline',
    order: 4,
  },
];

export const studentMoreItems = [
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Assigned tasks & to-dos',
    icon: 'mdi-checkbox-marked-outline',
    color: '#196CA2',
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
    color: '#F8C545',
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
    color: '#032F45',
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
    color: '#63BAC0',
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
    color: '#80162B',
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
    color: '#616161',
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
  {
    routeName: 'student-more',
    mobileTitle: 'More',
    mobileTab: null,
    mobileOrder: 11,
  },
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
