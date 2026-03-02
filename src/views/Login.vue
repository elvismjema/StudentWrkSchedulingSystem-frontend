<script setup>
import SocialLogin from "../components/SocialLogin.vue";
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

.login-social {
  display: flex;
  justify-content: center;
}

.login-footer {
  color: #6b7280;
  font-size: 14px;
}
</style>
