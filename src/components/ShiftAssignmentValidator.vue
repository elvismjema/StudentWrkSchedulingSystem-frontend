<template>
  <div>
    <!-- Validation Status -->
    <v-alert
      v-if="validationStatus"
      :type="validationStatus.type"
      :color="validationStatus.color"
      :icon="validationStatus.icon"
      class="mb-4"
      :prominent="validationStatus.type === 'error'"
    >
      <v-alert-title v-if="validationStatus.title">{{ validationStatus.title }}</v-alert-title>
      {{ validationStatus.message }}
      
      <!-- Missing Qualifications List -->
      <div v-if="validationStatus.missingQualifications?.length > 0" class="mt-3">
        <div class="font-weight-medium mb-2">Missing Qualifications:</div>
        <v-chip
          v-for="qual in validationStatus.missingQualifications"
          :key="qual.qualification_id"
          size="small"
          color="error"
          variant="outlined"
          class="mr-2 mb-2"
        >
          {{ qual.qualification_name }}
        </v-chip>
      </div>
      
      <!-- Not Approved Qualifications List -->
      <div v-if="validationStatus.notApprovedQualifications?.length > 0" class="mt-3">
        <div class="font-weight-medium mb-2">Qualifications Not Approved:</div>
        <v-chip
          v-for="qual in validationStatus.notApprovedQualifications"
          :key="qual.qualification_id"
          size="small"
          color="warning"
          variant="outlined"
          class="mr-2 mb-2"
        >
          {{ qual.qualification_name }}
          <v-icon start size="x-small">mdi-clock</v-icon>
        </v-chip>
      </div>
    </v-alert>

    <!-- Loading State -->
    <v-alert
      v-if="validating"
      type="info"
      class="mb-4"
    >
      <v-progress-circular
        indeterminate
        size="20"
        class="mr-2"
      ></v-progress-circular>
      Checking qualifications...
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import qualificationService from '@/services/qualificationService'

const props = defineProps({
  userId: {
    type: Number,
    default: null
  },
  positionId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['validation-complete'])

const validating = ref(false)
const validationStatus = ref(null)

// Watch for changes to user or position
watch([() => props.userId, () => props.positionId], async ([newUserId, newPositionId]) => {
  if (newUserId && newPositionId) {
    await validateQualifications(newUserId, newPositionId)
  } else {
    validationStatus.value = null
    emit('validation-complete', { isValid: false })
  }
}, { immediate: true })

const validateQualifications = async (userId, positionId) => {
  try {
    validating.value = true
    validationStatus.value = null

    // Get required qualifications for the position
    const positionResponse = await qualificationService.getPositionRequiredQualifications(positionId)
    const requiredQualifications = positionResponse.data || []

    if (requiredQualifications.length === 0) {
      validationStatus.value = {
        type: 'success',
        color: 'success',
        icon: 'mdi-check-circle',
        message: 'No qualifications required for this position.'
      }
      emit('validation-complete', { isValid: true })
      return
    }

    // Get user qualifications
    const userResponse = await qualificationService.getStudentQualifications(userId)
    const userQualifications = userResponse.data || []

    // Check if user has all required qualifications
    const missingQualifications = []
    const notApprovedQualifications = []

    for (const requiredQual of requiredQualifications) {
      const userQual = userQualifications.find(uq => uq.qualification_id === requiredQual.qualification_id)
      
      if (!userQual) {
        missingQualifications.push(requiredQual)
      } else if (userQual.approval_status !== 'approved') {
        notApprovedQualifications.push({
          ...requiredQual,
          approval_status: userQual.approval_status
        })
      }
    }

    if (missingQualifications.length === 0 && notApprovedQualifications.length === 0) {
      validationStatus.value = {
        type: 'success',
        color: 'success',
        icon: 'mdi-check-circle',
        message: `Student has all ${requiredQualifications.length} required qualification(s) and they are approved.`
      }
      emit('validation-complete', { isValid: true })
    } else {
      let message = 'Student cannot be assigned to this shift.'
      let title = 'Qualification Requirements Not Met'
      
      if (missingQualifications.length > 0 && notApprovedQualifications.length > 0) {
        message = `Missing ${missingQualifications.length} qualification(s) and ${notApprovedQualifications.length} qualification(s) not approved.`
      } else if (missingQualifications.length > 0) {
        message = `Missing ${missingQualifications.length} required qualification(s).`
      } else {
        message = `${notApprovedQualifications.length} qualification(s) not approved.`
      }

      validationStatus.value = {
        type: 'error',
        color: 'error',
        icon: 'mdi-alert-circle',
        title,
        message,
        missingQualifications,
        notApprovedQualifications
      }
      emit('validation-complete', { isValid: false })
    }

  } catch (error) {
    console.error('Error validating qualifications:', error)
    
    // Handle backend validation errors
    if (error.response?.status === 400 && error.response?.data?.missingQualifications) {
      const backendData = error.response.data
      validationStatus.value = {
        type: 'error',
        color: 'error',
        icon: 'mdi-alert-circle',
        title: 'Qualification Requirements Not Met',
        message: backendData.message || 'Student does not meet qualification requirements.',
        missingQualifications: backendData.missingQualifications || [],
        notApprovedQualifications: backendData.notApprovedQualifications || []
      }
    } else {
      validationStatus.value = {
        type: 'error',
        color: 'error',
        icon: 'mdi-alert-circle',
        title: 'Validation Error',
        message: 'Unable to verify qualifications. Please try again.'
      }
    }
    
    emit('validation-complete', { isValid: false })
  } finally {
    validating.value = false
  }
}

// Expose validation method for manual triggering
defineExpose({
  validateQualifications
})
</script>
