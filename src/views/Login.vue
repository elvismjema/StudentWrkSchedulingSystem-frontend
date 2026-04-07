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

        <div class="hero-social-proof">
          <v-icon color="white" size="18">mdi-account-group</v-icon>
          <span>Trusted by 200+ student workers across campus</span>
        </div>
      </div>

      <!-- Decorative background elements -->
      <div class="hero-deco hero-deco--1"></div>
      <div class="hero-deco hero-deco--2"></div>
    </div>

    <!-- Right: Login Card -->
    <div class="login-panel">
      <div class="login-card">
        <div class="login-card-logo">
          <img
            src="/oc-logo-white.png"
            alt="OC"
            class="login-card-logo-img"
          />
        </div>

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
      </div>

      <p class="login-panel-footer">
        Oklahoma Christian University &middot; Student Employment
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ─── Animations ──────────────────────────────────────── */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ─── Page Layout ─────────────────────────────────────── */
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
  background: linear-gradient(160deg, #8B1538 0%, #6B102C 40%, #4A0B1F 100%);
  color: #fff;
  padding: 48px 56px;
  overflow: hidden;
}

/* Grid pattern overlay */
.login-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 520px;
  animation: fadeInUp 0.5s ease both;
}

.hero-logo-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: grid;
  place-items: center;
  margin-bottom: 28px;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
}

.hero-logo {
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 1.05rem;
  font-weight: 400;
  opacity: 0.8;
  line-height: 1.6;
  margin-bottom: 36px;
}

.hero-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.hero-feature {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.9rem;
  opacity: 0.9;
  padding-left: 12px;
  border-left: 2px solid rgba(255, 255, 255, 0.2);
}

.hero-social-proof {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  opacity: 0.6;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Decorative shapes — glowing radial gradients */
.hero-deco {
  position: absolute;
  border-radius: 50%;
}

.hero-deco--1 {
  width: 500px;
  height: 500px;
  bottom: -160px;
  right: -120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
}

.hero-deco--2 {
  width: 300px;
  height: 300px;
  top: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%);
}

/* ─── Right Login Panel ─────────────────────────────────── */
.login-panel {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAFAFA;
  padding: 48px 40px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04);
  padding: 40px;
  text-align: center;
  animation: fadeInUp 0.5s ease 0.2s both;
}

.login-card-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #8B1538;
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
}

.login-card-logo-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.login-heading {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
}

.login-subheading {
  font-size: 0.9rem;
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
}

.login-panel-footer {
  margin-top: 24px;
  font-size: 0.75rem;
  color: #d1d5db;
  animation: fadeInUp 0.5s ease 0.4s both;
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

  .login-hero::before {
    display: none;
  }

  .hero-content {
    max-width: 100%;
  }

  .hero-title {
    font-size: 1.5rem;
    letter-spacing: normal;
  }

  .hero-features {
    display: none;
  }

  .hero-social-proof {
    display: none;
  }

  .hero-deco {
    display: none;
  }

  .login-panel {
    flex: 1;
    padding: 32px 20px;
  }

  .login-card {
    max-width: 100%;
    box-shadow: none;
    background: transparent;
    padding: 24px 16px;
  }
}
</style>
