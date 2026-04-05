<template>
  <div>
    <v-dialog v-model="dialogOpen" max-width="600px" persistent scrollable>
      <v-card>
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="#8B1538">mdi-account-plus</v-icon>
            <div>
              <h2>{{ isEditMode ? 'Edit Worker' : 'Add Worker' }}</h2>
              <p class="header-subtitle">
                {{ isEditMode ? 'Update worker information' : 'Add a new student worker to your department' }}
              </p>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeModal">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="modal-content">
          <!-- Email Validation Status -->
          <v-alert
            v-if="emailStatus.message"
            :type="emailStatus.type"
            variant="tonal"
            class="mb-4"
            closable
          >
            {{ emailStatus.message }}
          </v-alert>

          <!-- Loading State -->
          <div v-if="checkingEmail" class="loading-state">
            <v-progress-circular indeterminate color="#8B1538" size="24" />
            <span>Checking email availability...</span>
          </div>

          <!-- Worker Form -->
          <v-form v-else ref="form" v-model="valid" @submit.prevent="submitForm">
            <v-row>
              <!-- Name Fields -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.fName"
                  label="First Name *"
                  variant="outlined"
                  :rules="[rules.required]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.lName"
                  label="Last Name *"
                  variant="outlined"
                  :rules="[rules.required]"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <!-- Email Field -->
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.email"
                  label="Email Address *"
                  type="email"
                  variant="outlined"
                  :rules="[rules.required, rules.email]"
                  :loading="checkingEmail"
                  @blur="checkEmailExists"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <!-- Optional Fields -->
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone"
                  label="Phone Number"
                  type="tel"
                  variant="outlined"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.studentId"
                  label="Student ID"
                  variant="outlined"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <!-- Department (Auto-filled) -->
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.departmentName"
                  label="Department"
                  variant="outlined"
                  readonly
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <!-- Position Selection -->
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="form.positionId"
                  label="Position *"
                  :items="availablePositions"
                  item-title="position_name"
                  item-value="position_id"
                  variant="outlined"
                  :rules="[rules.required]"
                  :loading="loadingPositions"
                  hide-details="auto"
                >
                  <template #append-item>
                    <v-btn
                      v-if="!loadingPositions"
                      size="small"
                      variant="text"
                      color="#8B1538"
                      @click="openCreatePosition"
                    >
                      <v-icon start>mdi-plus</v-icon>
                      Create Position
                    </v-btn>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="modal-actions">
          <v-spacer />
          <v-btn variant="text" @click="closeModal">Cancel</v-btn>
          <v-btn
            color="#8B1538"
            :loading="submitting"
            :disabled="!valid || submitting"
            @click="submitForm"
          >
            {{ isEditMode ? 'Update Worker' : 'Add Worker' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Position Modal -->
    <CreatePositionModal
      v-model="createPositionModal.open"
      :department-id="form.departmentId"
      @position-created="onPositionCreated"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import apiClient from '../services/services.js';
import Utils from '../config/utils.js';
import CreatePositionModal from './CreatePositionModal.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  // Backward compatibility for older usages while migrating to v-model.
  open: {
    type: Boolean,
    default: undefined,
  },
  worker: Object, // For edit mode
});

const emit = defineEmits(['update:modelValue', 'close', 'worker-added', 'worker-updated']);

const dialogOpen = computed({
  get: () => (typeof props.open === 'boolean' ? props.open : props.modelValue),
  set: (value) => {
    emit('update:modelValue', value);
    if (!value) emit('close');
  },
});

// Form state
const form = reactive({
  fName: '',
  lName: '',
  email: '',
  phone: '',
  studentId: '',
  departmentId: null,
  departmentName: '',
  positionId: null,
});

// UI state
const valid = ref(false);
const submitting = ref(false);
const checkingEmail = ref(false);
const loadingPositions = ref(false);
const availablePositions = ref([]);
const emailStatus = reactive({
  type: '',
  message: '',
});

// Department context
const deptContext = Utils.getStore('currentDepartmentContext') || {};

// Computed properties
const isEditMode = computed(() => !!props.worker);

// Form validation rules
const rules = {
  required: (value) => !!value || 'This field is required',
  email: (value) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) || 'Please enter a valid email address';
  },
};

// Methods
const closeModal = () => {
  emit('update:modelValue', false);
  resetForm();
};

const resetForm = () => {
  Object.assign(form, {
    fName: props.worker?.fName || '',
    lName: props.worker?.lName || '',
    email: props.worker?.email || '',
    phone: props.worker?.phone || '',
    studentId: props.worker?.studentId || '',
    departmentId: deptContext.department_id,
    departmentName: deptContext.department_name || '',
    positionId: props.worker?.positionId || null,
  });
  
  emailStatus.type = '';
  emailStatus.message = '';
};

const loadPositions = async () => {
  if (!deptContext.department_id) return;

  loadingPositions.value = true;
  try {
    const response = await apiClient.get(`/positions?department_id=${deptContext.department_id}`);
    availablePositions.value = response?.data?.data || response?.data || [];
  } catch (error) {
    console.error('Error loading positions:', error);
    availablePositions.value = [];
  } finally {
    loadingPositions.value = false;
  }
};

const checkEmailExists = async () => {
  if (!form.email || !rules.email(form.email)) {
    emailStatus.type = '';
    emailStatus.message = '';
    return;
  }

  checkingEmail.value = true;
  emailStatus.type = '';
  emailStatus.message = '';

  try {
    const response = await apiClient.get(`/users/check-email/${encodeURIComponent(form.email)}`);
    const existingUser = response?.data;
    
    if (existingUser && existingUser.userId) {
      if (existingUser.userId !== props.worker?.userId) {
        emailStatus.type = 'info';
        emailStatus.message = `User exists: ${existingUser.fName} ${existingUser.lName}. Will be added to your department.`;
      } else {
        emailStatus.type = 'success';
        emailStatus.message = 'This is the current user\'s email.';
      }
    } else {
      emailStatus.type = 'success';
      emailStatus.message = 'Email available for new user creation.';
    }
  } catch (error) {
    emailStatus.type = 'error';
    emailStatus.message = 'Failed to check email availability.';
  } finally {
    checkingEmail.value = false;
  }
};

const submitForm = async () => {
  if (!form.value) return;

  submitting.value = true;
  try {
    const payload = {
      fName: form.fName.trim(),
      lName: form.lName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone?.trim() || null,
      studentId: form.studentId?.trim() || null,
      departmentId: form.departmentId,
      positionId: form.positionId,
    };

    if (isEditMode.value) {
      // Update existing worker
      const response = await apiClient.put(`/users/${props.worker.userId}`, payload);
      emit('worker-updated', response.data);
    } else {
      // Add new worker (or assign existing user)
      const response = await apiClient.post('/user-departments/assign-worker', payload);
      emit('worker-added', response.data);
    }

    closeModal();
  } catch (error) {
    console.error('Error saving worker:', error);
    // Handle error display (could add toast notification)
  } finally {
    submitting.value = false;
  }
};

const openCreatePosition = () => {
  createPositionModal.open = true;
};

const onPositionCreated = (newPosition) => {
  availablePositions.value.push(newPosition);
  form.positionId = newPosition.position_id;
};

// Watch for dialog open
watch(dialogOpen, (isOpen) => {
  if (isOpen) {
    resetForm();
    loadPositions();
  }
});

// Initialize department context
resetForm();
</script>

<style scoped>
.modal-header {
  padding: 24px 24px 0;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.header-icon {
  margin-top: 4px;
}

.header-content h2 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 600;
  color: #101828;
}

.header-subtitle {
  margin: 0;
  color: #667085;
  font-size: 14px;
}

.modal-content {
  padding: 0 24px 24px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  color: #667085;
  font-size: 14px;
}

.modal-actions {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
}

@media (max-width: 600px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
  }
  
  .modal-content {
    padding: 0 16px 16px;
  }
  
  .modal-actions {
    padding: 16px;
    flex-direction: column;
  }
}
</style>
