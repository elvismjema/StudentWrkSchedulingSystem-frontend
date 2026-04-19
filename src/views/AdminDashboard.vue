<template>
  <div class="admin-dashboard-page">
    <section class="page-header">
      <h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">System overview and quick access.</p>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-row class="kpi-grid">
      <v-col
        v-for="card in cards"
        :key="card.key"
        cols="12"
        md="6"
      >
        <v-card class="kpi-card" elevation="0" @click="goTo(card)">
          <v-card-text>
            <div class="kpi-label-row">
              <v-icon size="20" class="kpi-icon">{{ card.icon }}</v-icon>
              <span class="kpi-label">{{ card.label }}</span>
            </div>
            <div class="kpi-value">{{ card.value }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminServices from "../services/adminServices.js";
import DepartmentServices from "../services/departmentServices.js";
import UserRoleServices from "../services/userRoleServices.js";

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
.admin-dashboard-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 46px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text-1);
}

.page-subtitle {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 17px;
}

.kpi-grid {
  margin-top: 8px;
}

.kpi-card {
  border: 1px solid var(--border-1);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.kpi-card:hover {
  border-color: var(--border-1);
  box-shadow: 0 6px 18px rgba(16, 24, 40, 0.08);
  transform: translateY(-1px);
}

.kpi-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 18px;
}

.kpi-value {
  margin-top: 10px;
  font-size: 52px;
  line-height: 1;
  color: var(--text-1);
  font-weight: 700;
}

@media (max-width: 960px) {
  .page-title {
    font-size: 36px;
  }

  .kpi-value {
    font-size: 42px;
  }
}
</style>
