<template>
  <PageFrame>
    <template #header>
      <PageHeader :title="adminHeading" :subtitle="todayLabel" />
    </template>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <!-- Stat cards -->
    <div class="ad-stat-grid mb-4">
      <button
        v-for="card in cards"
        :key="card.key"
        class="ad-stat-card"
        @click="goTo(card)"
      >
        <div class="ad-stat-card__top">
          <v-icon size="20" class="ad-stat-card__icon">{{ card.icon }}</v-icon>
          <span class="ad-stat-card__label">{{ card.label }}</span>
        </div>
        <div class="ad-stat-card__value">{{ card.value }}</div>
      </button>
    </div>

    <!-- Quick actions -->
    <div class="ad-actions-row">
      <button class="ad-action-btn" @click="router.push('/admin/users')">
        <v-icon size="22" class="mb-1">mdi-account-multiple-outline</v-icon>
        <span>Manage Users</span>
      </button>
      <button class="ad-action-btn" @click="router.push('/admin/departments')">
        <v-icon size="22" class="mb-1">mdi-office-building-outline</v-icon>
        <span>Departments</span>
      </button>
      <button class="ad-action-btn" @click="router.push('/admin/system-settings')">
        <v-icon size="22" class="mb-1">mdi-cog-outline</v-icon>
        <span>System Settings</span>
      </button>
    </div>
  </PageFrame>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageFrame from "../components/PageFrame.vue";
import PageHeader from "../components/PageHeader.vue";
import AdminServices from "../services/adminServices.js";
import DepartmentServices from "../services/departmentServices.js";
import UserRoleServices from "../services/userRoleServices.js";
import Utils from "../config/utils.js";
import { TZ } from "../utils/tz.js";

const currentUser = Utils.getStore("user") || {};
const adminHeading = computed(() => {
  const firstName = currentUser?.fName || "";
  return firstName ? `Hey, ${firstName}` : "Hey there";
});
const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }),
);

const router = useRouter();
const error = ref("");
const users = ref([]);
const departments = ref([]);

const isStudentMembership = (membership) => {
  const level = Number(membership?.role?.permission_level || 0);
  const roleName = String(membership?.role?.role_name || "").toLowerCase();
  return (level > 0 && level < 50) || roleName.includes("student");
};

const isManagerMembership = (membership) => {
  const level = Number(membership?.role?.permission_level || 0);
  const roleName = String(membership?.role?.role_name || "").toLowerCase();
  return (level >= 50 && level < 90) || roleName.includes("manager");
};

const studentWorkersCount = computed(() =>
  users.value.filter((user) =>
    (user.userDepartments || []).some((membership) => isStudentMembership(membership)),
  ).length,
);

const managersCount = computed(() =>
  users.value.filter((user) =>
    (user.userDepartments || []).some((membership) => isManagerMembership(membership)),
  ).length,
);

const cards = computed(() => [
  {
    key: "total-users",
    label: "Total Users",
    icon: "mdi-account-group-outline",
    value: users.value.length,
    to: { path: "/admin/users" },
  },
  {
    key: "departments",
    label: "Departments",
    icon: "mdi-office-building-outline",
    value: departments.value.length,
    to: { path: "/admin/departments" },
  },
  {
    key: "student-workers",
    label: "Student Workers",
    icon: "mdi-account-school-outline",
    value: studentWorkersCount.value,
    to: { path: "/admin/users", query: { role: "student" } },
  },
  {
    key: "managers",
    label: "Managers",
    icon: "mdi-account-multiple-outline",
    value: managersCount.value,
    to: { path: "/admin/users", query: { role: "manager" } },
  },
]);

const normalizeUsers = (payload) => {
  const list = payload?.data || payload;
  if (!Array.isArray(list)) return [];
  return list.map((user) => ({
    ...user,
    userDepartments: Array.isArray(user.userDepartments) ? user.userDepartments : [],
  }));
};

const loadUsers = async () => {
  try {
    const response = await AdminServices.getAllUsers();
    users.value = normalizeUsers(response.data);
    return;
  } catch (primaryErr) {
    if (primaryErr?.response?.status !== 404) {
      throw primaryErr;
    }
  }

  const fallback = await UserRoleServices.getAllUsersWithRoles();
  users.value = normalizeUsers(fallback.data);
};

const loadDashboard = async () => {
  error.value = "";
  try {
    const [departmentsResponse] = await Promise.all([
      DepartmentServices.getDepartments(),
      loadUsers(),
    ]);
    departments.value = departmentsResponse?.data?.data || departmentsResponse?.data || [];
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load admin dashboard data.";
  }
};

const goTo = (card) => {
  router.push(card.to);
};

onMounted(loadDashboard);
</script>

<style scoped>
/* ── Stat card grid ───────────────────────────────────────────────────── */
.ad-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
@media (max-width: 960px) {
  .ad-stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ad-stat-grid { grid-template-columns: 1fr; }
}

.ad-stat-card {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: var(--font-sans);
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.ad-stat-card:hover {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
}
.ad-stat-card:hover .ad-stat-card__top,
.ad-stat-card:hover .ad-stat-card__icon,
.ad-stat-card:hover .ad-stat-card__label,
.ad-stat-card:hover .ad-stat-card__value {
  color: #fff;
}

.ad-stat-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}
.ad-stat-card__icon {
  color: var(--text-2);
  transition: color 0.15s ease;
}
.ad-stat-card__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  transition: color 0.15s ease;
}
.ad-stat-card__value {
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  color: var(--text-1);
  transition: color 0.15s ease;
}

/* ── Quick actions ────────────────────────────────────────────────────── */
.ad-actions-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
@media (max-width: 600px) {
  .ad-actions-row { grid-template-columns: 1fr; }
}

.ad-action-btn {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  cursor: pointer;
  width: 100%;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.ad-action-btn:hover {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
</style>
