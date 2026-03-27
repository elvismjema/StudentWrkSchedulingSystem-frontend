import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

import Login from "./views/Login.vue";

import EditTutorial from "./views/EditTutorial.vue";
import AddTutorial from "./views/AddTutorial.vue";
import ViewTutorial from "./views/ViewTutorial.vue";
import AddLesson from "./views/AddLesson.vue";
import EditLesson from "./views/EditLesson.vue";
import Student from "./views/Student.vue";
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
  return { name: "student-schedule" };
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
      component: Student,
      redirect: { name: "student-schedule" },
      children: [
        {
          path: "schedule",
          name: "student-schedule",
          component: () => import("./views/StudentSchedule.vue")
        },
        {
          path: "departments",
          name: "student-departments",
          component: () => import("./views/StudentDepartments.vue")
        },
        {
          path: "availability",
          name: "student-availability",
          component: () => import("./views/StudentAvailability.vue")
        },
        {
          path: "trade-board",
          name: "student-trade-board",
          component: () => import("./views/StudentTradeBoard.vue")
        },
        {
          path: "clock",
          name: "student-clock",
          component: () => import("./views/StudentClock.vue")
        },
        {
          path: "tasks",
          name: "student-tasks",
          component: () => import("./views/StudentTasks.vue")
        },
        {
          path: "notifications",
          name: "student-notifications",
          component: () => import("./views/StudentNotifications.vue")
        },
        {
          path: "profile",
          name: "student-profile",
          component: () => import("./views/StudentProfile.vue")
        },
        {
          path: "settings",
          name: "student-settings",
          component: () => import("./views/StudentSettings.vue")
        }
      ]
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
          component: StudentQualifications
        },
        {
          path: "shifts",
          name: "manager-shifts",
          component: ShiftManagement
        },

        {
          path: "dashboard",
          name: "manager-dashboard",
          component: () => import("./views/ManagerDashboard.vue")
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
          redirect: { name: "manager-schedule" },
        },
        {
          path: "availability",
          name: "manager-availability",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Availability", description: "Review worker availability and constraints." }
        },
        {
          path: "approvals",
          name: "manager-approvals",
          component: () => import("./views/ManagerApprovals.vue")
        },
        {
          path: "time-attendance",
          name: "manager-time-attendance",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Time & Attendance", description: "Track clock-in activity and attendance records." }
        },
        {
          path: "workers",
          name: "manager-workers",
          component: () => import("./views/UserManagement.vue"),
        },
        {
          path: "tasks",
          name: "manager-tasks",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Tasks", description: "Assign and monitor worker tasks." }
        },
        {
          path: "reports",
          name: "manager-reports",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Reports", description: "Generate operational and staffing reports." }
        },
        {
          path: "notifications",
          name: "manager-notifications",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Notifications", description: "Review manager alerts and notifications." }
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
          path: "admin/users",
          name: "manager-admin-users",
          component: () => import("./views/AdminUsers.vue"),
        },
        {
          path: "admin/departments",
          name: "manager-admin-departments",
          component: () => import("./views/DepartmentSettings.vue"),
        },
      ]
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
          component: () => import("./views/ManagerDashboard.vue"),
        },
        {
          path: "users",
          name: "admin-users",
          component: () => import("./views/AdminUsers.vue"),
        },
        {
          path: "departments",
          name: "admin-departments",
          component: () => import("./views/DepartmentSettings.vue"),
        },
        {
          path: "reports",
          name: "admin-reports",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Reports", description: "View system-wide staffing and operations reports." }
        },
        {
          path: "profile",
          name: "admin-profile",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Profile", description: "Review your admin account profile and access details." }
        },
        {
          path: "settings",
          name: "admin-settings",
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "System Settings", description: "Manage global system configuration." }
        }
      ]
    },

    }

  ],
});

router.beforeEach((to) => {
  const role = getStoredRole();

  if (!role || to.name === "login") {
    return true;
  }

  if (to.path.startsWith("/manager") && role !== "manager" && role !== "admin") {
    return { name: "student-schedule" };
  }

  // Admin-only routes under manager path — managers without admin role are redirected.
  if (to.path.startsWith("/manager/admin") && role !== "admin") {
    return { name: "manager-dashboard" };
  }

  if (to.path.startsWith("/admin") && role !== "admin") {
    return role === "manager" ? { name: "manager-dashboard" } : { name: "student-schedule" };
  }

  if (to.path.startsWith("/manager") && role === "admin" && !to.path.startsWith("/manager/admin")) {
    return { name: "admin-dashboard" };
  }

  if (to.path.startsWith("/student") && (role === "manager" || role === "admin")) {
    return role === "admin" ? { name: "admin-dashboard" } : { name: "manager-dashboard" };
  }

  return true;
});

export default router;
