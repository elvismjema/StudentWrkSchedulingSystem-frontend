<template>
  <div class="positions-page">
    <div class="page-header">
      <h1 class="page-title">Department Positions</h1>
      <v-btn color="#8B1538" variant="outlined" prepend-icon="mdi-plus" @click="createPositionModal.open = true">
        Create Position
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="#8B1538" size="40" />
      <p class="loading-text">Loading positions...</p>
    </div>

    <div v-else-if="positions.length === 0" class="empty-state">
      <v-icon size="48" color="#667085">mdi-briefcase-outline</v-icon>
      <h3 class="empty-title">No positions yet</h3>
      <p class="empty-subtitle">Create your first position for this department.</p>
    </div>

    <div v-else class="positions-grid">
      <v-card v-for="position in positions" :key="position.position_id" class="position-card" elevation="0">
        <v-card-text class="position-card-content">
          <div class="position-header">
            <h3 class="position-name">{{ position.position_name }}</h3>
            <div class="position-actions">
              <v-btn size="small" variant="text" color="error" :disabled="position.workerCount > 0" @click="confirmDeletePosition(position)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
          <p class="position-description">{{ position.description || "No description available" }}</p>
          <div class="position-meta">
            <v-chip v-if="position.is_critical" size="small" color="warning" variant="tonal">
              <v-icon start>mdi-alert</v-icon>
              Critical
            </v-chip>
            <span class="worker-count">{{ position.workerCount || 0 }} workers assigned</span>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <CreatePositionModal
      v-model="createPositionModal.open"
      :department-id="deptContext.department_id"
      @position-created="onPositionCreated"
    />

    <v-dialog v-model="deletePositionModal.open" max-width="400px">
      <v-card>
        <v-card-title class="text-h6 pa-4">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Delete Position?
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="deletePositionModal.position?.workerCount > 0" class="text-body-2 mb-3">
            <strong>Cannot delete this position.</strong> It is currently assigned to
            {{ deletePositionModal.position.workerCount }} worker(s).
          </p>
          <p v-else class="text-body-2 mb-3">
            Are you sure you want to delete
            <strong>"{{ deletePositionModal.position?.position_name }}"</strong>?
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deletePositionModal.open = false">Cancel</v-btn>
          <v-btn v-if="deletePositionModal.position?.workerCount === 0" color="error" @click="deletePosition">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";
import CreatePositionModal from "../components/CreatePositionModal.vue";

const deptContext = Utils.getStore("currentDepartmentContext") || {};

const loading = ref(false);
const error = ref("");
const workers = ref([]);
const positions = ref([]);

const createPositionModal = reactive({
  open: false,
});

const deletePositionModal = reactive({
  open: false,
  position: null,
});

const toItems = (response) => response?.data?.data || response?.data || [];

const loadWorkers = async () => {
  if (!deptContext.department_id) {
    workers.value = [];
    return;
  }
  try {
    const response = await apiClient.get(`/user-departments?departmentId=${deptContext.department_id}&status=approved`);
    const assignments = toItems(response);
    workers.value = assignments
      .map((assignment) => assignment.user || assignment)
      .filter((worker) => worker && (worker.userId || worker.id));
  } catch {
    workers.value = [];
  }
};

const loadPositions = async () => {
  if (!deptContext.department_id) {
    positions.value = [];
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const response = await apiClient.get(`/positions?department_id=${deptContext.department_id}`);
    const items = toItems(response);
    positions.value = items.map((position) => {
      const workerCount = workers.value.filter(
        (worker) =>
          worker.positionId === position.position_id ||
          worker.position?.position_id === position.position_id,
      ).length;
      return { ...position, workerCount };
    });
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load positions.";
    positions.value = [];
  } finally {
    loading.value = false;
  }
};

const onPositionCreated = () => {
  loadPositions();
};

const confirmDeletePosition = (position) => {
  deletePositionModal.position = position;
  deletePositionModal.open = true;
};

const deletePosition = async () => {
  if (!deletePositionModal.position) return;
  try {
    await apiClient.delete(`/positions/${deletePositionModal.position.position_id}`);
    deletePositionModal.open = false;
    deletePositionModal.position = null;
    await loadPositions();
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to delete position.";
  }
};

onMounted(async () => {
  await loadWorkers();
  await loadPositions();
});
</script>

<style scoped>
.positions-page {
  padding: 24px;
  max-width: 1400px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 42px;
  font-weight: 700;
  color: #101828;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-text {
  margin-top: 12px;
  color: #667085;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-title {
  margin: 16px 0 8px;
  font-size: 20px;
  color: #101828;
}

.empty-subtitle {
  margin: 0;
  color: #667085;
}

.positions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 20px;
}

.position-card {
  border: 1px solid #e3e5e8;
  border-radius: 16px;
}

.position-card-content {
  padding: 28px;
}

.position-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.position-name {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  font-weight: 700;
  color: #101828;
}

.position-description {
  margin: 0 0 14px;
  color: #667085;
  font-size: 16px;
}

.position-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.worker-count {
  color: #667085;
  font-size: 14px;
}

@media (max-width: 768px) {
  .positions-page {
    padding: 16px;
  }

  .page-title {
    font-size: 32px;
  }

  .positions-grid {
    grid-template-columns: 1fr;
  }

  .position-name {
    font-size: 34px;
  }
}
</style>
