<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-account-plus</v-icon>
      Assign Shift
      <v-spacer></v-spacer>
      <v-btn @click="$emit('close')" icon="mdi-close" variant="text"></v-btn>
    </v-card-title>
    
    <v-divider></v-divider>
    
    <v-card-text>
      <v-form ref="formRef" v-model="formValid">
        <!-- Shift Info -->
        <div class="mb-4">
          <div class="text-subtitle-2 font-weight-medium mb-2">Shift Details</div>
          <v-card variant="outlined" class="pa-3">
            <div class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-calendar-clock</v-icon>
              <div>
                <div class="font-weight-medium">{{ shiftInfo.title || 'Untitled Shift' }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDate(shiftInfo.shift_date) }} • {{ shiftInfo.start_time }} - {{ shiftInfo.end_time }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ shiftInfo.department_name }} • {{ shiftInfo.position_name }}
                </div>
              </div>
            </div>
          </v-card>
        </div>

        <!-- User Selection -->
        <div class="mb-4">
          <div class="text-subtitle-2 font-weight-medium mb-2">Select Student</div>
          <v-select
            v-model="selectedUserId"
            :items="availableUsers"
            item-title="display_name"
            item-value="user_id"
            label="Choose a student"
            variant="outlined"
            :rules="[v => !!v || 'Please select a student']"
            :loading="usersLoading"
            :disabled="usersLoading"
            clearable
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.display_name">
                <template v-slot:prepend>
                  <v-avatar size="32" color="primary" class="mr-2">
                    <span class="text-white text-caption font-weight-medium">
                      {{ getInitials(item.raw.first_name, item.raw.last_name) }}
                    </span>
                  </v-avatar>
                </template>
                <v-list-item-subtitle>
                  {{ item.raw.email }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-select>
        </div>

      </v-form>
    </v-card-text>
    
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn @click="$emit('close')" variant="text">Cancel</v-btn>
      <v-btn
        @click="assignShift"
        color="primary"
        variant="elevated"
        :loading="assigning"
        :disabled="!formValid || !canAssign"
      >
        <v-icon start>mdi-check</v-icon>
        Assign Shift
      </v-btn>
    </v-card-actions>
  </v-card>

  <!-- Success Snackbar -->
  <v-snackbar
    v-model="showSuccess"
    color="success"
    timeout="4000"
  >
    <v-icon start>mdi-check-circle</v-icon>
    {{ successMessage }}
  </v-snackbar>

  <!-- Error Snackbar -->
  <v-snackbar
    v-model="showError"
    color="error"
    timeout="6000"
  >
    <v-icon start>mdi-alert-circle</v-icon>
    {{ errorMessage }}
  </v-snackbar>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import shiftService from '../services/shiftService.js'
import UserRoleServices from '../services/userRoleServices.js'

const props = defineProps({
  shiftInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'assigned'])

// Form state
const formRef = ref(null)
const formValid = ref(false)
const selectedUserId = ref(null)
const availableUsers = ref([])
const usersLoading = ref(false)
const assigning = ref(false)

// Validation state
const canAssign = computed(() => Boolean(selectedUserId.value))

// UI state
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Computed
const selectedUser = computed(() => {
  return availableUsers.value.find(user => user.user_id === selectedUserId.value)
})

// Methods
const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
}

const loadAvailableUsers = async () => {
  try {
    usersLoading.value = true
    const response = await UserRoleServices.getAllUsersWithRoles(true)
    const users = response?.data || []

    const departmentMembers = users.filter((user) =>
      (user.userDepartments || []).some(
        (membership) =>
          Number(membership.department_id) === Number(props.shiftInfo.department_id),
      ),
    )

    const studentMembers = departmentMembers.filter((user) =>
      (user.userDepartments || []).some(
        (membership) =>
          Number(membership.department_id) === Number(props.shiftInfo.department_id) &&
          String(membership?.role?.role_name || "").toLowerCase().includes("student"),
      ),
    )

    const candidateUsers = studentMembers.length > 0 ? studentMembers : departmentMembers

    availableUsers.value = candidateUsers
      .filter((user) =>
        Number(user.id) !== Number(props.shiftInfo.created_by),
      )
      .map((user) => ({
        user_id: user.id,
        first_name: user.fName,
        last_name: user.lName,
        email: user.email,
        display_name: `${user.fName || ""} ${user.lName || ""}`.trim(),
      }))
  } catch (error) {
    console.error('Error loading available users:', error)
    errorMessage.value = 'Failed to load available students'
    showError.value = true
  } finally {
    usersLoading.value = false
  }
}

const assignShift = async () => {
  if (!formValid.value || !canAssign.value) return

  try {
    assigning.value = true
    
    await shiftService.updateShift(props.shiftInfo.shift_id, {
      assigned_user_id: selectedUserId.value
    })
    
    successMessage.value = `Shift assigned to ${selectedUser.value.display_name} successfully!`
    showSuccess.value = true
    
    // Emit success event
    emit('assigned', {
      shiftId: props.shiftInfo.shift_id,
      userId: selectedUserId.value,
      userName: selectedUser.value.display_name
    })
    
    // Close after a short delay
    setTimeout(() => {
      emit('close')
    }, 1500)
    
  } catch (error) {
    console.error('Error assigning shift:', error)

    errorMessage.value = error?.response?.data?.message || 'Failed to assign shift. Please try again.'
    showError.value = true
  } finally {
    assigning.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadAvailableUsers()
})
</script>
