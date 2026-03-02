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
import ShiftManagement from "./views/ShiftManagement.vue";

const getStoredRole = () => {
  const user = Utils.getStore("user");
  return (user?.role || "").toLowerCase();
};

const getDefaultDashboardRoute = () => {
  const role = getStoredRole();
  return role === "manager" || role === "admin"
    ? { name: "manager-dashboard" }
    : { name: "student-schedule" };
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
          path: "create-shift",
          name: "manager-create-shift",
          component: ShiftManagement,
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
          component: () => import("./views/ManagerPlaceholder.vue"),
          props: { title: "Approvals", description: "Approve or reject pending requests." }
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
          path: "settings",
          name: "manager-settings",
          component: () => import("./views/DepartmentSettings.vue"),
        }
      ]
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

  if (to.path.startsWith("/student") && (role === "manager" || role === "admin")) {
    return { name: "manager-dashboard" };
  }

  return true;
});

export default router;
