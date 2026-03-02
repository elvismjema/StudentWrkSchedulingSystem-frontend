import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";

import Login from "./views/Login.vue";
import ManagerDashboard from "./views/ManagerDashboard.vue";

import TutorialsList from "./views/TutorialsList.vue";
import EditTutorial from "./views/EditTutorial.vue";
import AddTutorial from "./views/AddTutorial.vue";
import ViewTutorial from "./views/ViewTutorial.vue";
import AddLesson from "./views/AddLesson.vue";
import EditLesson from "./views/EditLesson.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: "/manager",
      name: "managerDashboard",
      component: ManagerDashboard,
      meta: { requiresAuth: true, managerOnly: true },
    },
    {
      path: "/tutorials",
      name: "tutorials",
      component: TutorialsList,
      meta: { requiresAuth: true },
    },
    {
      path: "/edit/:id",
      name: "edit",
      component: EditTutorial,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/add",
      name: "add",
      component: AddTutorial,
      meta: { requiresAuth: true },
    },
    {
      path: "/view/:id",
      name: "view",
      component: ViewTutorial,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/addLesson/:tutorialId",
      name: "addLesson",
      component: AddLesson,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/editLesson/:tutorialId/:lessonId",
      name: "editLesson",
      component: EditLesson,
      props: true,
      meta: { requiresAuth: true },
    },
  ],
});

const getDefaultRouteForUser = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (role === "manager" || role === "admin") {
    return { name: "managerDashboard" };
  }
  return { name: "tutorials" };
};

router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const isAuthenticated = Boolean(user?.token);
  const role = String(user?.role || "").toLowerCase();
  const isManager = role === "manager" || role === "admin";

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: "login" });
    return;
  }

  if (to.name === "login" && isAuthenticated) {
    next(getDefaultRouteForUser(user));
    return;
  }

  if (to.meta.managerOnly && !isManager) {
    next(getDefaultRouteForUser(user));
    return;
  }

  next();
});

export default router;
