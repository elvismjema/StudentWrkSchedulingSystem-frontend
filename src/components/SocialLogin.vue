<script setup>
import { ref, onMounted } from "vue";
import { Capacitor } from "@capacitor/core";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const fName = ref("");
const lName = ref("");
const user = ref({});
const loginError = ref("");
const isNative = Capacitor.isNativePlatform();

// ─── Shared: process the credential token from either flow ───
const handleCredentialResponse = async (response) => {
  loginError.value = "";
  let token = {
    credential: response.credential,
  };
  await AuthServices.loginUser(token)
    .then((response) => {
      user.value = response.data;
      const role = (user.value.role || "").toLowerCase();
      if (!user.value.token || (role !== "manager" && role !== "admin" && role !== "student")) {
        loginError.value =
          user.value.message ||
          "Login failed. Please try again in a few moments.";
        Utils.removeItem("user");
        return;
      }

      Utils.setStore("user", user.value);
      fName.value = user.value.fName;
      lName.value = user.value.lName;

      // Deep-link restore: navigate to the originally intended path if available
      const redirectPath = route.query.redirect;
      if (redirectPath && redirectPath !== "/" && redirectPath !== "/login") {
        router.push(redirectPath);
      } else if (role === "admin") {
        router.push({ name: "admin-dashboard" });
      } else if (role === "manager") {
        router.push({ name: "manager-dashboard" });
      } else if (role === "student") {
        router.push({ name: "student-dashboard" });
      }
    })
    .catch((error) => {
      console.log("error", error);
      loginError.value =
        error?.response?.data?.message ||
        "Login request failed. The backend may be temporarily unavailable.";
    });
};

// ─── Native (iOS / Android): Capacitor Google Auth plugin ───
const signInNative = async () => {
  loginError.value = "";
  try {
    const { GoogleAuth } = await import("@southdevs/capacitor-google-auth");
    const googleUser = await GoogleAuth.signIn();
    // The plugin returns authentication.idToken which is the same
    // credential the backend expects from the web GIS flow.
    const idToken = googleUser.authentication?.idToken;
    if (!idToken) {
      loginError.value = "Google sign-in did not return a token. Please try again.";
      return;
    }
    await handleCredentialResponse({ credential: idToken });
  } catch (err) {
    console.error("Native Google sign-in error:", err);
    // User cancelled — not a real error
    if (err?.message?.includes("canceled") || err?.message?.includes("cancelled")) {
      return;
    }
    loginError.value = "Google sign-in failed. Please try again.";
  }
};

// ─── Web: existing Google Identity Services flow ───
const loginWithGoogle = () => {
  loginError.value = "";
  window.handleCredentialResponse = handleCredentialResponse;
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  console.log(client);
  window.google.accounts.id.initialize({
    client_id: client,
    cancel_on_tap_outside: false,
    auto_select: true,
    callback: window.handleCredentialResponse,
  });
  window.google.accounts.id.renderButton(document.getElementById("parent_id"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    width: 400,
  });
};

// ─── Init: pick the right flow based on platform ───
const initNativeAuth = async () => {
  try {
    const { GoogleAuth } = await import("@southdevs/capacitor-google-auth");
    GoogleAuth.initialize({
      clientId: '249489666247-vpkk3eqqsubpekr5pt166prhhi32t4to.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (err) {
    console.error("Failed to initialize native GoogleAuth:", err);
  }
};

onMounted(() => {
  if (isNative) {
    initNativeAuth();
  } else {
    loginWithGoogle();
  }
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <!-- Web: Google renders its own button here -->
      <div v-if="!isNative" display="flex" id="parent_id"></div>

      <!-- Native: custom button that triggers Capacitor plugin -->
      <v-btn
        v-if="isNative"
        variant="outlined"
        size="large"
        class="text-none"
        prepend-icon="mdi-google"
        @click="signInNative"
        style="min-width: 300px;"
      >
        Sign in with Google
      </v-btn>
    </v-row>
    <v-alert
      v-if="loginError"
      class="mt-4"
      type="error"
      variant="tonal"
      density="compact"
    >
      {{ loginError }}
    </v-alert>
  </div>
</template>
