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
    <!-- Left: Brand Hero -->
    <div class="login-hero">
      <div class="hero-content">
        <div class="hero-logo-wrap" aria-hidden="true">
          <img
            class="hero-logo"
            src="/oc-logo-white.png"
            alt="Oklahoma Christian University"
          />
        </div>

        <h1 class="hero-title">Student Worker Scheduling System</h1>
        <p class="hero-subtitle">
          Streamline campus employment scheduling for Oklahoma Christian University
        </p>

        <div class="hero-features">
          <div class="hero-feature">
            <v-icon color="white" size="22">mdi-calendar-check</v-icon>
            <span>Smart shift scheduling and template management</span>
          </div>
          <div class="hero-feature">
            <v-icon color="white" size="22">mdi-clock-check-outline</v-icon>
            <span>Real-time clock-in tracking and attendance</span>
          </div>
          <div class="hero-feature">
            <v-icon color="white" size="22">mdi-swap-horizontal</v-icon>
            <span>Seamless shift swaps and availability management</span>
          </div>
        </div>

        <p class="hero-footer-text">Oklahoma Christian University &middot; Student Employment</p>
      </div>

      <!-- Subtle background decoration -->
      <div class="hero-deco hero-deco--1"></div>
      <div class="hero-deco hero-deco--2"></div>
    </div>

    <!-- Right: Login Card -->
    <div class="login-panel">
      <div class="login-card-inner">
        <h2 class="login-heading">Welcome back</h2>
        <p class="login-subheading">Sign in to manage your schedule</p>

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

        <p class="login-policy">
          By signing in, you agree to the university's policies
        </p>

        <p class="login-card-footer">
          Oklahoma Christian University &middot; Student Employment
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
}

/* ─── Left Hero ─────────────────────────────────────────── */
.login-hero {
  position: relative;
  flex: 0 0 60%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8B1538 0%, #5C0D25 100%);
  color: #fff;
  padding: 48px 56px;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 520px;
}

.hero-logo-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: grid;
  place-items: center;
  margin-bottom: 28px;
}

.hero-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.85;
  line-height: 1.5;
  margin-bottom: 36px;
}

.hero-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 48px;
}

.hero-feature {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.hero-footer-text {
  font-size: 0.8rem;
  opacity: 0.5;
}

/* Decorative shapes */
.hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
}

.hero-deco--1 {
  width: 400px;
  height: 400px;
  bottom: -120px;
  right: -100px;
}

.hero-deco--2 {
  width: 250px;
  height: 250px;
  top: -60px;
  left: -60px;
}

/* ─── Right Login Panel ─────────────────────────────────── */
.login-panel {
  flex: 0 0 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 48px 40px;
}

.login-card-inner {
  width: 100%;
  max-width: 380px;
  text-align: center;
}

.login-heading {
  font-size: 1.65rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.login-subheading {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 32px;
}

.login-social {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.login-policy {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 32px;
}

.login-card-footer {
  font-size: 0.8rem;
  color: #d1d5db;
}

/* ─── Mobile / Tablet (<960px) ──────────────────────────── */
@media (max-width: 959px) {
  .login-page {
    flex-direction: column;
  }

  .login-hero {
    flex: none;
    padding: 32px 24px;
  }

  .hero-content {
    max-width: 100%;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .hero-features {
    margin-bottom: 24px;
  }

  .hero-footer-text {
    display: none;
  }

  .hero-deco {
    display: none;
  }

  .login-panel {
    flex: 1;
    padding: 32px 24px;
  }
}
</style>
