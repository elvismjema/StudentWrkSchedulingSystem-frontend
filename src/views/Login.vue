<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import SocialLogin from "../components/SocialLogin.vue";

const route = useRoute();

const showRedirectMessage = computed(() => {
  return route.query.redirect != null;
});
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <img
          src="/oc-logo-white.png"
          alt="Oklahoma Christian University"
          class="login-logo-img"
        />
      </div>

      <h1 class="login-heading">Student Worker Scheduling</h1>
      <p class="login-subheading">Sign in to continue</p>

      <v-alert
        v-if="showRedirectMessage"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-5"
      >
        Please sign in to continue
      </v-alert>

      <div class="login-social">
        <SocialLogin />
      </div>

      <p class="login-footer">Oklahoma Christian University</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f9fafb;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  border-top: 3px solid #8B1538;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 48px 40px 36px;
  text-align: center;
  animation: fadeIn 0.4s ease both;
}

.login-logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #8B1538;
  display: grid;
  place-items: center;
  margin: 0 auto 24px;
}

.login-logo-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.login-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: #8B1538;
  margin-bottom: 4px;
}

.login-subheading {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 32px;
}

.login-social {
  display: flex;
  justify-content: center;
  margin-bottom: 28px;
}

.login-footer {
  font-size: 0.75rem;
  color: #9ca3af;
  letter-spacing: 0.02em;
}
</style>
