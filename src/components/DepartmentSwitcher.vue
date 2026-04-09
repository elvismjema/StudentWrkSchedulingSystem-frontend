<template>
  <v-menu offset-y min-width="300" v-if="canSwitchDepartments">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        variant="outlined"
        prepend-icon="mdi-office-building"
        append-icon="mdi-chevron-down"
        class="department-switcher-btn"
      >
        {{ currentDepartmentName || 'Select Department' }}
      </v-btn>
    </template>

    <v-list>
      <v-list-subheader>Switch Department Context</v-list-subheader>
      
      <v-list-item
        v-for="dept in userDepartments"
        :key="dept.ud_id"
        @click="switchDepartment(dept)"
        :class="{ 'v-list-item--active': dept.department_id === currentDepartmentId }"
      >
        <template v-slot:prepend>
          <v-icon :color="getRoleColor(dept.role?.permission_level)">
            mdi-office-building
          </v-icon>
        </template>

        <v-list-item-title>
          {{ dept.department?.department_name }}
        </v-list-item-title>

        <v-list-item-subtitle>
          {{ dept.role?.role_name || 'No Role' }}
          <span v-if="dept.position"> - {{ dept.position.position_name }}</span>
        </v-list-item-subtitle>

        <template v-slot:append>
          <v-icon v-if="dept.department_id === currentDepartmentId" color="primary">
            mdi-check
          </v-icon>
        </template>
      </v-list-item>

      <v-divider v-if="userDepartments.length === 0"></v-divider>
      
      <v-list-item v-if="userDepartments.length === 0" disabled>
        <v-list-item-title class="text-grey">
          No department assignments
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import UserRoleServices from '../services/userRoleServices.js';
import Utils from '../config/utils.js';

const router = useRouter();

// State
const userDepartments = ref([]);
const currentDepartmentId = ref(null);
const loading = ref(false);

// Computed
const currentDepartmentName = computed(() => {
  const current = userDepartments.value.find(
    dept => dept.department_id === currentDepartmentId.value
  );
  return current?.department?.department_name || '';
});

const canSwitchDepartments = computed(() => {
  const user = Utils.getStore('user');
  const userRole = (user?.role || "").toLowerCase();
  return userRole === "manager" || userRole === "admin";
});

// Methods
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';  // Admin
  if (permissionLevel >= 50) return 'orange';  // Manager
  return 'blue';  // Student/Worker
};

const loadUserDepartments = async () => {
  try {
    loading.value = true;
    const user = Utils.getStore('user');
    
    if (!user || !user.id) {
      return;
    }

    const response = await UserRoleServices.getUserRoles(user.id);
    userDepartments.value = response.data;

    // Get user's role to determine if they can switch departments
    const userRole = (user.role || "").toLowerCase();
    const canSwitchDepartments = userRole === "manager" || userRole === "admin";

    // Set current department from storage or default to first (only for managers/admins)
    const storedContext = Utils.getStore('currentDepartmentContext');
    if (storedContext && canSwitchDepartments) {
      currentDepartmentId.value = storedContext.department_id;
    } else if (userDepartments.value.length > 0 && canSwitchDepartments) {
      currentDepartmentId.value = userDepartments.value[0].department_id;
      saveDepartmentContext(userDepartments.value[0]);
    } else if (userDepartments.value.length > 0) {
      // For students, just set the context without allowing switching
      const activeDept = userDepartments.value.find(dept => dept.is_active === true);
      if (activeDept) {
        currentDepartmentId.value = activeDept.department_id;
        saveDepartmentContext(activeDept);
      }
    }
  } catch (err) {
    console.error('Failed to load user departments:', err);
  } finally {
    loading.value = false;
  }
};

const switchDepartment = (department) => {
  currentDepartmentId.value = department.department_id;
  saveDepartmentContext(department);
  
  // Emit event for parent components to react
  window.dispatchEvent(new CustomEvent('departmentContextChanged', {
    detail: department
  }));

  // Refresh the current page to reflect new context
  router.go(0);
};

const saveDepartmentContext = (department) => {
  const context = {
    department_id: department.department_id,
    department_name: department.department?.department_name,
    role_id: department.role_id,
    role_name: department.role?.role_name,
    permission_level: department.role?.permission_level,
    position_id: department.position_id,
    position_name: department.position?.position_name
  };
  
  Utils.setStore('currentDepartmentContext', context);
};

// Lifecycle
onMounted(() => {
  loadUserDepartments();
});
</script>

<style scoped>
.department-switcher-btn {
  text-transform: none;
  font-weight: 500;
}
</style>
