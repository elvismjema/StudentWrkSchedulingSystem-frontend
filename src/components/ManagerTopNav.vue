<template>
  <ManagerTopBar />
</template>

<script>
/**
 * @deprecated Compatibility shim.
 *
 * This file used to own the manager top bar implementation. It has been
 * replaced by ManagerTopBar.vue, which is rendered directly inside
 * ManagerShell. We keep this file only because Admin.vue still imports
 * ManagerTopNav.vue; the admin shell will be migrated to ManagerShell in a
 * follow-up PR, at which point this file can be deleted.
 *
 * The old @toggle-sidebar emit is intentionally accepted and ignored — the
 * rail toggle now lives inside the sidebar footer, so consumers that still
 * bind the event will just see it no-op.
 */
export default {
  name: "ManagerTopNav",
};
</script>

<script setup>
import ManagerTopBar from "./ManagerTopBar.vue";

// Declare the legacy event so Vue doesn't warn when Admin.vue binds it.
defineEmits(["toggle-sidebar"]);
</script>
