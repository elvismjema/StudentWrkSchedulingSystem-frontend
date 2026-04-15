<script setup>
import { ref, onBeforeUnmount, onMounted } from "vue";
import { Capacitor } from "@capacitor/core";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter, useRoute } from "vue-router";

const GOOGLE_SCOPES = ["profile", "email", "openid"];
const isNativePlatform = Capacitor.isNativePlatform();
const DEFAULT_WEB_CLIENT_ID =
  "249489666247-vpkk3eqqsubpekr5pt166prhhi32t4to.apps.googleusercontent.com";
const DEFAULT_IOS_CLIENT_ID =
  "249489666247-vhnci059dbsgp2i8mm8gh40fjlargsrk.apps.googleusercontent.com";
const webClientId = import.meta.env.VITE_APP_CLIENT_ID || DEFAULT_WEB_CLIENT_ID;
const iosClientId = import.meta.env.VITE_APP_IOS_CLIENT_ID || DEFAULT_IOS_CLIENT_ID;

const router = useRouter();
const route = useRoute();
const fName = ref("");
const lName = ref("");
const user = ref({});
const loginError = ref("");
const isSigningIn = ref(false);

let nativeGoogleAuth;

const finalizeLogin = async ({ credential, accessToken } = {}) => {
  if (!credential) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const payload = {
    credential,
  };

  if (accessToken) {
    payload.accessToken = accessToken;
  }

  const response = await AuthServices.loginUser(payload);
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
};

const handleCredentialResponse = async (response) => {
  loginError.value = "";
  isSigningIn.value = true;

  try {
    await finalizeLogin({
      credential: response?.credential,
    });
  } catch (error) {
    console.log("error", error);
    loginError.value =
      error?.response?.data?.message ||
      error?.message ||
      "Login request failed. The backend may be temporarily unavailable.";
  } finally {
    isSigningIn.value = false;
  }
};

const loginWithGoogle = () => {
  loginError.value = "";

  if (!webClientId) {
    loginError.value = "Missing Google web client ID configuration.";
    return;
  }

  if (!window.google?.accounts?.id) {
    loginError.value = "Google Sign-In failed to load. Please refresh and try again.";
    return;
  }

  window.handleCredentialResponse = handleCredentialResponse;

  const target = document.getElementById("parent_id");
  if (!target) {
    loginError.value = "Google Sign-In failed to render. Please refresh and try again.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: webClientId,
    cancel_on_tap_outside: false,
    auto_select: true,
    callback: window.handleCredentialResponse,
  });

  target.innerHTML = "";
  window.google.accounts.id.renderButton(target, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    width: 400,
  });
};

const getNativeGoogleAuth = async () => {
  if (nativeGoogleAuth) {
    return nativeGoogleAuth;
  }

  const { GoogleAuth } = await import("@southdevs/capacitor-google-auth");
  nativeGoogleAuth = GoogleAuth;

  await nativeGoogleAuth.initialize({
    clientId: iosClientId,
    scopes: GOOGLE_SCOPES,
  });

  return nativeGoogleAuth;
};

const signInNative = async () => {
  loginError.value = "";
  isSigningIn.value = true;

  try {
    if (!iosClientId) {
      throw new Error("Missing Google iOS client ID configuration.");
    }

    if (!webClientId) {
      throw new Error("Missing Google web/server client ID configuration.");
    }

    const GoogleAuth = await getNativeGoogleAuth();
    const googleUser = await GoogleAuth.signIn({
      clientId: iosClientId,
      serverClientId: webClientId,
      scopes: GOOGLE_SCOPES,
    });

    await finalizeLogin({
      credential: googleUser?.authentication?.idToken,
      accessToken: googleUser?.authentication?.accessToken,
    });
  } catch (error) {
    console.log("error", error);

    if (error?.message?.includes("canceled") || error?.message?.includes("cancelled")) {
      return;
    }

    loginError.value =
      error?.response?.data?.message ||
      error?.message ||
      "Native Google sign-in failed. Please try again.";
  } finally {
    isSigningIn.value = false;
  }
};

onMounted(() => {
  if (isNativePlatform) {
    return;
  }

  loginWithGoogle();
});

onBeforeUnmount(() => {
  if (window.handleCredentialResponse === handleCredentialResponse) {
    delete window.handleCredentialResponse;
  }
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <template v-if="isNativePlatform">
        <v-btn
          color="#8B1538"
          variant="outlined"
          size="large"
          prepend-icon="mdi-google"
          :loading="isSigningIn"
          :disabled="isSigningIn"
          @click="signInNative"
        >
          Sign in with Google
        </v-btn>
      </template>
      <div v-else display="flex" id="parent_id"></div>
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
