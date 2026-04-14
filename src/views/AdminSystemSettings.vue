<template>
  <div class="admin-settings pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">System Settings</h1>
        <p class="text-medium-emphasis mt-1">Configure system-wide preferences</p>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        :loading="saving"
        :disabled="!hasChanges"
        @click="saveAll"
      >
        Save Changes
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="loading">
      <v-skeleton-loader v-for="n in 3" :key="n" type="card" class="mb-4" />
    </div>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = null">
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadSettings">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Settings by category -->
    <template v-else>
      <v-card
        v-for="(settings, category) in editableSettings"
        :key="category"
        elevation="0"
        class="mb-5 pa-5"
        rounded="lg"
      >
        <h2 class="text-h6 font-weight-medium text-capitalize mb-4">{{ category }}</h2>

        <div v-for="s in settings" :key="s.id" class="mb-4">
          <div class="d-flex align-center">
            <div class="flex-grow-1 mr-4">
              <div class="text-body-2 font-weight-medium">{{ formatKey(s.key) }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.description }}</div>
            </div>

            <!-- Boolean toggle -->
            <v-switch
              v-if="s.type === 'boolean'"
              v-model="s.editValue"
              color="primary"
              density="compact"
              hide-details
              inset
            />

            <!-- Number input -->
            <v-text-field
              v-else-if="s.type === 'number'"
              v-model.number="s.editValue"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 120px"
            />

            <!-- String input -->
            <v-text-field
              v-else
              v-model="s.editValue"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 280px"
            />
          </div>
          <v-divider class="mt-3" />
        </div>
      </v-card>
    </template>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom end">
      {{ snackMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import settingService from "../services/systemSettingService.js";

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const editableSettings = ref({});
const originalValues = ref({});

const snackbar = ref(false);
const snackMessage = ref("");
const snackColor = ref("success");

function toast(msg, color = "success") {
  snackMessage.value = msg;
  snackColor.value = color;
  snackbar.value = true;
}

const hasChanges = computed(() => {
  for (const settings of Object.values(editableSettings.value)) {
    for (const s of settings) {
      if (s.editValue !== originalValues.value[s.id]) return true;
    }
  }
  return false;
});

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadSettings() {
  loading.value = true;
  error.value = null;
  try {
    const res = await settingService.getAll();
    const grouped = res.data || {};

    // Prepare editable copies
    const editable = {};
    const originals = {};
    for (const [cat, items] of Object.entries(grouped)) {
      editable[cat] = items.map((s) => ({
        ...s,
        editValue: s.type === "boolean" ? !!s.value : s.value,
      }));
      for (const s of items) {
        originals[s.id] = s.type === "boolean" ? !!s.value : s.value;
      }
    }

    editableSettings.value = editable;
    originalValues.value = originals;
  } catch (e) {
    error.value = e.response?.data?.message || e.message || "Failed to load settings";
  } finally {
    loading.value = false;
  }
}

async function saveAll() {
  saving.value = true;
  try {
    const updates = [];
    for (const settings of Object.values(editableSettings.value)) {
      for (const s of settings) {
        if (s.editValue !== originalValues.value[s.id]) {
          updates.push({ id: s.id, value: s.editValue });
        }
      }
    }

    if (updates.length === 0) return;

    const res = await settingService.bulkUpdate(updates);
    // Reload to get fresh state
    const grouped = res.data || {};
    const editable = {};
    const originals = {};
    for (const [cat, items] of Object.entries(grouped)) {
      editable[cat] = items.map((s) => ({
        ...s,
        editValue: s.type === "boolean" ? !!s.value : s.value,
      }));
      for (const s of items) {
        originals[s.id] = s.type === "boolean" ? !!s.value : s.value;
      }
    }
    editableSettings.value = editable;
    originalValues.value = originals;

    toast("Settings saved");
  } catch (e) {
    toast(e.response?.data?.message || "Failed to save settings", "error");
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
}
</style>
