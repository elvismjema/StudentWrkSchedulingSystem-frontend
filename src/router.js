import { createRouter, createWebHistory } from "vue-router";

import Login from "./views/Login.vue";

import EditTutorial from "./views/EditTutorial.vue";
import AddTutorial from "./views/AddTutorial.vue";
import ViewTutorial from "./views/ViewTutorial.vue";
import AddLesson from "./views/AddLesson.vue";
import EditLesson from "./views/EditLesson.vue";
import Student from "./views/Student.vue";
import StudentQualifications from "./views/StudentQualifications.vue";
import ShiftManagement from "./views/ShiftManagement.vue";

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
      redirect: { name: "student-schedule" },
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
          path: "settings",
          name: "student-settings",
          component: () => import("./views/StudentSettings.vue")
        }
      ]
    },
    {
      path: "/manager",
      name: "manager",
      component: () => import("./views/Manager.vue"),
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
        }
      ]
    },
  ],
});

export default router;
