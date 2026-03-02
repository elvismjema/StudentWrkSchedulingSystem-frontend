<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="28" class="mr-3" color="primary">mdi-calendar-clock</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Shift Management</h1>
        <p class="text-subtitle-1 text-medium-emphasis">Create and manage work shifts</p>
      </div>
      <v-spacer></v-spacer>
      <v-btn
        @click="showCreateDialog = true"
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
      >
        Create Shift
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.department_id"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.position_id"
              :items="positions"
              item-title="position_name"
              item-value="position_id"
              label="Position"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.shift_date"
              type="date"
              label="Date"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-btn
              @click="loadShifts"
              color="primary"
              variant="elevated"
              block
              height="40"
              :loading="shiftsLoading"
            >
              <v-icon left>mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Shifts Table -->
    <v-card elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-text</v-icon>
        Shifts
        <v-spacer></v-spacer>
        <v-chip
          v-if="filteredShifts.length > 0"
          color="primary"
          size="small"
        >
          {{ filteredShifts.length }} shifts
        </v-chip>
      </v-card-title>
      
      <v-divider></v-divider>
      
      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="filteredShifts"
          :loading="shiftsLoading"
          class="elevation-0"
        >
          <!-- Date Column -->
          <template v-slot:item.shift_date="{ item }">
            <div class="font-weight-medium">
              {{ formatDate(item.shift_date) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getDayOfWeek(item.shift_date) }}
            </div>
          </template>

          <!-- Time Column -->
          <template v-slot:item.time="{ item }">
            <div class="font-weight-medium">
              {{ item.start_time }} - {{ item.end_time }}
            </div>
          </template>

          <!-- Position Column -->
          <template v-slot:item.position="{ item }">
            <div class="d-flex align-center">
              <div>
                <div class="font-weight-medium">{{ item.position?.position_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.department?.department_name }}
                </div>
              </div>
            </div>
          </template>

          <!-- Assigned User Column -->
          <template v-slot:item.assigned_user="{ item }">
            <div v-if="item.assignedUser">
              <div class="d-flex align-center">
                    <v-avatar size="32" color="primary" class="mr-2">
                      <span class="text-white text-caption font-weight-medium">
                        {{ getInitials(item.assignedUser.fName, item.assignedUser.lName) }}
                      </span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">
                        {{ item.assignedUser.fName }} {{ item.assignedUser.lName }}
                      </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ item.assignedUser.email }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <v-chip color="grey" size="small" variant="outlined">
                Unassigned
              </v-chip>
            </div>
          </template>

          <!-- Status Column -->
          <template v-slot:item.status="{ item }">
            <v-chip
              :color="getStatusColor(item.is_published)"
              size="small"
            >
              {{ item.is_published ? 'Published' : 'Draft' }}
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn
                @click="editShift(item)"
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="primary"
              ></v-btn>
              
              <v-btn
                @click="assignShift(item)"
                icon="mdi-account-plus"
                size="small"
                variant="text"
                color="success"
              ></v-btn>
              
              <v-btn
                @click="deleteShift(item)"
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
              ></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Shift Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-plus</v-icon>
          Create New Shift
        </v-card-title>
        
        <v-divider></v-divider>
        
        <v-card-text>
          <v-form ref="createFormRef" v-model="createFormValid">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newShift.department_id"
                  :items="departments"
                  item-title="department_name"
                  item-value="department_id"
                  label="Department"
                  variant="outlined"
                  :rules="[v => !!v || 'Department is required']"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newShift.position_id"
                  :items="positions"
                  item-title="position_name"
                  item-value="position_id"
                  label="Position"
                  variant="outlined"
                  :rules="[v => !!v || 'Position is required']"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.shift_date"
                  type="date"
                  label="Date"
                  variant="outlined"
                  :rules="[v => !!v || 'Date is required']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.start_time"
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  :rules="[v => !!v || 'Start time is required']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.end_time"
                  type="time"
                  label="End Time"
                  variant="outlined"
                  :rules="[v => !!v || 'End time is required']"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="newShift.is_published"
                  label="Publish immediately"
                  hide-details
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showCreateDialog = false" variant="text">Cancel</v-btn>
          <v-btn
            @click="createShift"
            color="primary"
            variant="elevated"
            :loading="creating"
            :disabled="!createFormValid"
          >
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assignment Dialog -->
    <v-dialog v-model="showAssignDialog" max-width="800px">
      <ShiftAssignmentForm
        v-if="selectedShift"
        :shift-info="selectedShift"
        @close="showAssignDialog = false"
        @assigned="onShiftAssigned"
      />
    </v-dialog>

    <!-- Success/Error Snackbars -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="4000"
    >
      <v-icon start>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <v-snackbar
      v-model="showError"
      color="error"
      timeout="6000"
    >
      <v-icon start>mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ShiftAssignmentForm from '../components/ShiftAssignmentForm.vue'
import shiftService from '../services/shiftService.js'
import apiClient from '../services/services.js'

// State
const shifts = ref([])
const departments = ref([])
const positions = ref([])
const filters = ref({
  department_id: null,
  position_id: null,
  shift_date: null
})

// Dialog states
const showCreateDialog = ref(false)
const showAssignDialog = ref(false)

// Form states
const createFormRef = ref(null)
const createFormValid = ref(false)
const newShift = ref({
  department_id: null,
  position_id: null,
  shift_date: '',
  start_time: '',
  end_time: '',
  is_published: false
})

// Selection states
const selectedShift = ref(null)

// Loading states
const shiftsLoading = ref(false)
const creating = ref(false)

// UI states
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Data table
const headers = [
  { title: 'Date', key: 'shift_date', sortable: true },
  { title: 'Time', key: 'time', sortable: false },
  { title: 'Position', key: 'position', sortable: false },
  { title: 'Assigned To', key: 'assigned_user', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, width: 120 }
]

// Computed
const filteredShifts = computed(() => {
  let filtered = shifts.value

  if (filters.value.department_id) {
    filtered = filtered.filter(shift => shift.department_id === filters.value.department_id)
  }
  if (filters.value.position_id) {
    filtered = filtered.filter(shift => shift.position_id === filters.value.position_id)
  }
  if (filters.value.shift_date) {
    filtered = filtered.filter(shift => shift.shift_date === filters.value.shift_date)
  }

  return filtered
})

// Methods
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const getDayOfWeek = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' })
}

const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const getStatusColor = (isPublished) => {
  return isPublished ? 'success' : 'grey'
}

const loadShifts = async () => {
  try {
    shiftsLoading.value = true
    const response = await shiftService.listShifts(filters.value)
    shifts.value = response.data || []
  } catch (error) {
    console.error('Error loading shifts:', error)
    errorMessage.value = 'Failed to load shifts'
    showError.value = true
  } finally {
    shiftsLoading.value = false
  }
}

const loadDepartments = async () => {
  try {
    const response = await apiClient.get('/departments')
    departments.value = response?.data?.data || []
  } catch (error) {
    console.error('Error loading departments:', error)
  }
}

const loadPositions = async () => {
  try {
    const response = await apiClient.get('/positions')
    positions.value = response?.data?.data || []
  } catch (error) {
    console.error('Error loading positions:', error)
  }
}

const createShift = async () => {
  if (!createFormValid.value) return

  try {
    creating.value = true
    
    const response = await shiftService.createShift(newShift.value)
    
    successMessage.value = 'Shift created successfully!'
    showSuccess.value = true
    
    // Reset form and close dialog
    newShift.value = {
      department_id: null,
      position_id: null,
      shift_date: '',
      start_time: '',
      end_time: '',
      is_published: false
    }
    showCreateDialog.value = false
    
    // Reload shifts
    loadShifts()
  } catch (error) {
    console.error('Error creating shift:', error)
    errorMessage.value = 'Failed to create shift'
    showError.value = true
  } finally {
    creating.value = false
  }
}

const editShift = (shift) => {
  // Implement edit functionality
  console.log('Edit shift:', shift)
}

const assignShift = (shift) => {
  selectedShift.value = shift
  showAssignDialog.value = true
}

const deleteShift = async (shift) => {
  if (!confirm(`Are you sure you want to delete this shift?`)) return

  try {
    await shiftService.deleteShift(shift.shift_id)
    
    successMessage.value = 'Shift deleted successfully!'
    showSuccess.value = true
    
    // Reload shifts
    loadShifts()
  } catch (error) {
    console.error('Error deleting shift:', error)
    errorMessage.value = 'Failed to delete shift'
    showError.value = true
  }
}

const onShiftAssigned = (assignmentData) => {
  successMessage.value = `Shift assigned to ${assignmentData.userName} successfully!`
  showSuccess.value = true
  showAssignDialog.value = false
  loadShifts()
}

// Lifecycle
onMounted(() => {
  Promise.all([
    loadShifts(),
    loadDepartments(),
    loadPositions()
  ])
})
</script>
