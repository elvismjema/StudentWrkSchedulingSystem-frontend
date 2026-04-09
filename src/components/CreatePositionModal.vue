<template>
  <div>
    <v-dialog v-model="dialogOpen" max-width="500px" persistent>
      <v-card>
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="#8B1538">mdi-briefcase-plus</v-icon>
            <div>
              <h2>Create Position</h2>
              <p class="header-subtitle">Add a new position to your department</p>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeModal">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="modal-content">
          <v-form ref="form" v-model="valid" @submit.prevent="submitForm">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.positionName"
                  label="Position Name *"
                  variant="outlined"
                  :rules="[rules.required]"
                  placeholder="e.g., Barista, Cashier, Front Desk"
                  hide-details="auto"
                  autofocus
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  variant="outlined"
                  rows="3"
                  placeholder="Optional: Describe the responsibilities and requirements for this position"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-checkbox
                  v-model="form.isCritical"
                  label="Critical Position"
                  color="#8B1538"
                  hide-details
                >
                  <template #append>
                    <v-tooltip>
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="small"
                          color="info"
                        >mdi-help-circle-outline</v-icon>
                      </template>
                      <span>
                        Critical positions require immediate attention when unfilled (e.g., Lifeguard, Front Desk)
                      </span>
                    </v-tooltip>
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <div class="color-picker-section">
                  <div class="color-picker-label">Schedule Color <span class="optional-label">(optional)</span></div>
                  <p class="color-picker-hint">Choose a color to represent this position on the Manager Schedule.</p>
                  <div class="color-picker-row">
                    <input
                      type="color"
                      class="color-input"
                      :value="form.color || '#8B1538'"
                      @input="form.color = $event.target.value"
                    />
                    <span class="color-preview-swatch" :style="{ backgroundColor: form.color || '#8B1538' }"></span>
                    <span class="color-hex-label">{{ form.color || '#8B1538' }}</span>
                    <v-btn size="small" variant="text" @click="form.color = null">Reset</v-btn>
                  </div>
                </div>
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
            Create Position
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import apiClient from '../services/services.js';

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
  departmentId: Number,
});

const emit = defineEmits(['update:modelValue', 'close', 'position-created']);

const dialogOpen = computed({
  get: () => (typeof props.open === 'boolean' ? props.open : props.modelValue),
  set: (value) => {
    emit('update:modelValue', value);
    if (!value) emit('close');
  },
});

// Form state
const form = reactive({
  positionName: '',
  description: '',
  isCritical: false,
  color: null,
});

// UI state
const valid = ref(false);
const submitting = ref(false);

// Form validation rules
const rules = {
  required: (value) => !!value?.trim() || 'Position name is required',
};

// Methods
const closeModal = () => {
  emit('update:modelValue', false);
  resetForm();
};

const resetForm = () => {
  form.positionName = '';
  form.description = '';
  form.isCritical = false;
  form.color = null;
  valid.value = false;
  submitting.value = false;
};

const submitForm = async () => {
  submitting.value = true;
  try {
    const payload = {
      department_id: props.departmentId,
      position_name: form.positionName.trim(),
      description: form.description.trim() || null,
      is_critical: form.isCritical,
      color: form.color || null,
    };

    const response = await apiClient.post('/positions', payload);
    const newPosition = response?.data?.data || response?.data;
    
    emit('position-created', newPosition);
    closeModal();
  } catch (error) {
    console.error('Error creating position:', error);
    // Handle error display (could add toast notification)
  } finally {
    submitting.value = false;
  }
};

// Watch for dialog open
watch(dialogOpen, (isOpen) => {
  if (isOpen) {
    resetForm();
  }
});
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

.modal-actions {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
}

.color-picker-section {
  border: 1px solid #e3e5e8;
  border-radius: 10px;
  padding: 14px 16px;
}

.color-picker-label {
  font-size: 14px;
  font-weight: 600;
  color: #101828;
  margin-bottom: 4px;
}

.optional-label {
  font-weight: 400;
  color: #667085;
  font-size: 12px;
}

.color-picker-hint {
  font-size: 12px;
  color: #667085;
  margin: 0 0 10px;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 44px;
  height: 36px;
  border: 1px solid #e3e5e8;
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
  background: none;
}

.color-preview-swatch {
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.12);
}

.color-hex-label {
  font-size: 13px;
  font-family: monospace;
  color: #374151;
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
