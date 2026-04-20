<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const fName = ref("");
const lName = ref("");
const user = ref({});
const loginError = ref("");

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

      Utils.removeItem("currentDepartmentContext");
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

onMounted(() => {
  loginWithGoogle();
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <div display="flex" id="parent_id"></div>
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
