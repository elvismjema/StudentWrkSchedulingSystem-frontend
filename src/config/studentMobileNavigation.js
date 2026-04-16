const studentMobilePrimaryTabs = [
  {
    key: 'dashboard',
    label: 'Home',
    routeName: 'student-dashboard',
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    iconOutline: 'mdi-view-dashboard-outline',
    order: 0,
  },
  {
    key: 'schedule',
    label: 'Schedule',
    routeName: 'student-schedule',
    title: 'My Schedule',
    icon: 'mdi-calendar-clock',
    iconOutline: 'mdi-calendar-clock-outline',
    order: 1,
  },
  {
    key: 'clock',
    label: 'Clock In',
    routeName: 'student-clock',
    title: 'Clock In/Out',
    icon: 'mdi-clock-check-outline',
    iconOutline: 'mdi-clock-check-outline',
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
    key: 'more',
    label: 'More',
    routeName: 'student-more',
    title: 'More',
    icon: 'mdi-dots-horizontal-circle',
    iconOutline: 'mdi-dots-horizontal-circle-outline',
    hasBadge: true,
    order: 4,
  },
];

export const studentMoreItems = [
  {
    key: 'availability',
    label: 'Availability',
    description: 'Weekly hours & time off',
    icon: 'mdi-calendar-edit',
    color: '#0D9488',
    routeName: 'student-availability',
    title: 'Availability',
    tab: 'more',
    order: 5,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Assigned tasks & to-dos',
    icon: 'mdi-checkbox-marked-outline',
    color: '#196CA2',
    routeName: 'student-tasks',
    title: 'Tasks',
    tab: 'more',
    order: 6,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Alerts & messages',
    icon: 'mdi-bell-outline',
    color: '#F8C545',
    routeName: 'student-notifications',
    title: 'Notifications',
    tab: 'more',
    order: 7,
  },
  {
    key: 'departments',
    label: 'Departments',
    description: 'Your departments',
    icon: 'mdi-office-building',
    color: '#032F45',
    routeName: 'student-departments',
    title: 'Departments',
    tab: 'more',
    order: 8,
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    description: 'Skills & certifications',
    icon: 'mdi-certificate',
    color: '#63BAC0',
    routeName: 'student-qualifications',
    title: 'Qualifications',
    tab: 'more',
    order: 9,
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your account info',
    icon: 'mdi-account',
    color: '#80162B',
    routeName: 'student-profile',
    title: 'Profile',
    tab: 'more',
    order: 10,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Preferences & config',
    icon: 'mdi-cog',
    color: '#616161',
    routeName: 'student-settings',
    title: 'Settings',
    tab: 'more',
    order: 11,
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
