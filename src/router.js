import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

import Login from "./views/Login.vue";

import EditTutorial from "./views/EditTutorial.vue";
import AddTutorial from "./views/AddTutorial.vue";
import ViewTutorial from "./views/ViewTutorial.vue";
import AddLesson from "./views/AddLesson.vue";
import EditLesson from "./views/EditLesson.vue";
import StudentShell from "./views/StudentShell.vue";
import Manager from "./views/Manager.vue";
import Admin from "./views/Admin.vue";
import ShiftManagement from "./views/ShiftManagement.vue";

const getStoredRole = () => {
  const user = Utils.getStore("user");
  return (user?.role || "").toLowerCase();
};

const getDefaultDashboardRoute = () => {
  const role = getStoredRole();
  if (role === "admin") return { name: "admin-dashboard" };
  if (role === "manager") return { name: "manager-dashboard" };
  return { name: "student-dashboard" };
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/tutorials",
      name: "tutorials",
      redirect: () => getDefaultDashboardRoute(),
    },
    {
      path: "/edit/:id",
      name: "edit",
      component: EditTutorial,
      props: true,
    },
    {
      path: "/add",
      name: "add",
      component: AddTutorial,
    },
    {
      path: "/view/:id",
      name: "view",
      component: ViewTutorial,
      props: true,
    },
    {
      path: "/addLesson/:tutorialId",
      name: "addLesson",
      component: AddLesson,
      props: true,
    },
    {
      path: "/editLesson/:tutorialId/:lessonId",
      name: "editLesson",
      component: EditLesson,
      props: true,
    },
    {
      path: "/student",
      name: "student",
      component: StudentShell,
      redirect: { name: "student-dashboard" },
      children: [
        {
          path: "dashboard",
          name: "student-dashboard",
          component: () => import("./views/StudentDashboard.vue"),
        },
        {
          path: "schedule",
          name: "student-schedule",
          component: () => import("./views/StudentSchedule.vue"),
        },
        {
          path: "clock",
          name: "student-clock",
          component: () => import("./views/StudentClock.vue"),
        },
        {
          path: "more",
          name: "student-more",
          component: () => import("./views/StudentMore.vue"),
        },
        {
          path: "departments",
          name: "student-departments",
          component: () => import("./views/StudentDepartments.vue"),
        },
        {
          path: "availability",
          name: "student-availability",
          component: () => import("./views/StudentAvailability.vue"),
        },
        {
          path: "trade-board",
          name: "student-trade-board",
          component: () => import("./views/StudentTradeBoard.vue"),
        },
        {
          path: "tasks",
          name: "student-tasks",
          component: () => import("./views/StudentTasks.vue"),
        },
        {
          path: "notifications",
          name: "student-notifications",
          component: () => import("./views/StudentNotifications.vue"),
        },
        {
          path: "profile",
          name: "student-profile",
          component: () => import("./views/StudentProfile.vue"),
        },
        {
          path: "qualifications",
          name: "student-qualifications",
          component: () => import("./views/StudentQualifications.vue"),
        },
        {
          path: "settings",
          name: "student-settings",
          component: () => import("./views/StudentSettings.vue"),
        },
        {
          path: "shifts/:id",
          name: "student-shift-detail",
          redirect: { name: "student-schedule" },
        },
      ],
    },
    // Top-level /shifts/:id → redirect to student schedule
    {
      path: "/shifts/:id",
      redirect: { name: "student-schedule" },
    },
    {
      path: "/manager",
      name: "manager",
      component: Manager,
      redirect: { name: "manager-dashboard" },
      children: [

        {
          path: "qualifications",
          name: "manager-qualifications",
          component: () => import("./views/StudentQualifications.vue")
        },
        {
          path: "shifts",
          name: "manager-shifts",
          component: ShiftManagement
        },
        {
          path: "dashboard",
          name: "manager-dashboard",
          component: () => import("./views/ManagerDashboard.vue"),
        },
        {
          path: "schedule",
          name: "manager-schedule",
          component: ShiftManagement,
        },
        {
          path: "templates",
          name: "manager-templates",
          component: () => import("./views/ScheduleTemplates.vue"),
        },
        {
          path: "create-shift",
          name: "manager-create-shift",
          component: () => import("./views/ManagerCreateShift.vue"),
        },
        {
          path: "approvals",
          name: "manager-approvals",
          component: () => import("./views/ManagerApprovals.vue"),
        },
        {
          path: "time-pay",
          name: "manager-time-pay",
          component: () => import("./views/ManagerTimePay.vue"),
        },
        {
          path: "time-attendance",
          redirect: { name: "manager-time-pay" },
        },
        {
          path: "tasks",
          name: "manager-tasks",
          component: () => import("./views/ManagerTasks.vue"),
        },
        {
          path: "reports",
          name: "manager-reports",
          component: () => import("./views/ManagerReports.vue"),
        },
        {
          path: "notifications",
          name: "manager-notifications",
          component: () => import("./views/StudentNotifications.vue"),
        },
        {
          path: "profile",
          name: "manager-profile",
          component: () => import("./views/ManagerProfile.vue"),
        },
        {
          path: "settings",
          name: "manager-settings",
          component: () => import("./views/DepartmentSettings.vue"),
        },
        // ─── Admin-only routes ──────────────────────────────────────────────
        {
          path: "workers",
          name: "manager-student-workers",
          component: () => import("./views/ManagerStudentWorkers.vue"),
        },
        {
          path: "positions",
          name: "manager-positions",
          component: () => import("./views/ManagerPositions.vue"),
        },
        {
          path: "admin/users",
          name: "manager-admin-users",
          component: () => import("./views/AdminUsers.vue"),
        },
        {
          path: "admin/departments",
          name: "manager-admin-departments",
          component: () => import("./views/AdminDepartmentSettings.vue"),
        },
      ],
    },
    {
      path: "/admin",
      name: "admin",
      component: Admin,
      redirect: { name: "admin-dashboard" },
      children: [
        {
          path: "dashboard",
          name: "admin-dashboard",
          component: () => import("./views/AdminDashboard.vue"),
        },
        {
          path: "users",
          name: "admin-users",
          component: () => import("./views/AdminUsers.vue"),
        },
        {
          path: "departments",
          name: "admin-departments",
          component: () => import("./views/AdminDepartmentSettings.vue"),
        },
        {
          path: "reports",
          name: "admin-reports",
          component: () => import("./views/ManagerReports.vue"),
        },

        {
          path: "settings",
          name: "admin-settings",
          component: () => import("./views/AdminSystemSettings.vue"),
        }
      ]
    }
  ],
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
router.beforeEach((to) => {
  const user = Utils.getStore("user");
  const role = (user?.role || "").toLowerCase();
  const token = user?.token;

  // Allow login page for everyone
  if (to.name === "login") {
    // If already logged in, redirect to dashboard
    if (role && token) return getDefaultDashboardRoute();
    return true;
  }

  // Require authentication for all other routes
  if (!role || !token) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  // Role-based access control
  if (to.path.startsWith("/manager/admin") && role !== "admin") {
    return { name: "manager-dashboard" };
  }

  if (to.path.startsWith("/manager") && role !== "manager" && role !== "admin") {
    return { name: "student-dashboard" };
  }

  if (to.path.startsWith("/admin") && role !== "admin") {
    return role === "manager"
      ? { name: "manager-dashboard" }
      : { name: "student-dashboard" };
  }

  if (to.path.startsWith("/student") && (role === "manager" || role === "admin")) {
    return role === "admin"
      ? { name: "admin-dashboard" }
      : { name: "manager-dashboard" };
  }

  return true;
});

// If a lazy-loaded route chunk fails to load (e.g. stale deployment or 404),
// navigate to the target URL directly so the browser fetches a fresh page
// rather than silently doing nothing.
router.onError((error, to) => {
  const chunkFailure =
    error?.message?.includes("Failed to fetch dynamically imported module") ||
    error?.message?.includes("Unable to preload") ||
    error?.name === "ChunkLoadError";

  if (chunkFailure && to?.fullPath) {
    window.location.assign(Utils.resolveAppUrl(to.fullPath));
  }
});

export default router;
