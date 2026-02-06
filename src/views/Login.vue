<script setup>
import { ref } from "vue";
import SocialLogin from "../components/SocialLogin.vue";

const email = ref("");
const password = ref("");

const onLogin = () => {
  // Placeholder for future email/password login.
};
</script>

<template>
  <v-container class="login-page" fluid>
    <v-card class="login-card" elevation="8">
      <div class="login-logo-wrap" aria-hidden="true">
        <img
          class="login-logo"
          src="/oc-logo-white.png"
          alt="Oklahoma Christian University"
        />
      </div>
      <h1 class="login-title">Student Worker Scheduling System</h1>
      <p class="login-subtitle">Manage your campus work schedule</p>

      <v-form class="login-form" @submit.prevent="onLogin">
        <v-text-field
          v-model="email"
          label="Email"
          placeholder="username@oc.edu"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          variant="outlined"
          density="comfortable"
        />
        <v-btn class="login-btn" type="submit" block>Log In</v-btn>
      </v-form>

      <div class="login-divider">
        <span>OR</span>
      </div>

      <div class="login-social">
        <SocialLogin />
      </div>
    </v-card>

    <p class="login-footer">Oklahoma Christian University</p>
  </v-container>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: #f7f7f7;
}

.login-card {
  width: min(520px, 92vw);
  padding: 40px 36px 32px;
  border-radius: 16px;
  text-align: center;
  background: #ffffff;
}

.login-logo-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #7a0026;
  margin: 0 auto 12px;
}

.login-logo {
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #2b2b2b;
  margin: 8px 0 6px;
}

.login-subtitle {
  color: #6b7280;
  font-size: 16px;
  margin-bottom: 24px;
}

.login-form :deep(.v-input) {
  margin-bottom: 12px;
}

.login-btn {
  background: #7a0026;
  color: #ffffff;
  font-weight: 600;
  text-transform: none;
  padding: 12px 0;
  border-radius: 10px;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: #9aa0a6;
  font-size: 14px;
}

.login-divider::before,
.login-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.login-social {
  display: flex;
  justify-content: center;
}

.login-footer {
  color: #6b7280;
  font-size: 14px;
}
</style>
