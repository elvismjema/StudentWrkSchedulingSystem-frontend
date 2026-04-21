import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import router from "./router.js";
import vuetify from "./plugins/vuetify.js";
import "./styles/tokens.css";
import Utils from "./config/utils.js";
import { initOneSignal, loginOneSignal } from "./config/oneSignal.js";

// ---------------------------------------------------------------------------
// Explicit service worker registration.
//
// vite-plugin-pwa's auto-injected registerSW.js wires registration to the
// `window.load` event. On iOS PWAs installed to the Home Screen, `load` can
// fire BEFORE that script executes — so the listener attaches to an event
// that already happened, and the service worker is never registered. The
// symptom is `navigator.serviceWorker.ready` hanging forever when the user
// tries to enable push notifications, because there is no SW to become ready.
//
// Registering explicitly here guarantees the call happens regardless of
// `load` timing. `immediate: true` registers as soon as this module runs.
//
// The same SW file now also hosts the OneSignal push module (via
// importScripts at the top of src/sw.js), so this single registration is
// what OneSignal uses for push delivery too — no separate OneSignalSDKWorker.js
// registration is needed.
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

// ---------------------------------------------------------------------------
// OneSignal Web SDK bootstrap.
//
// Init runs once per page load. If a user is already signed in (present in
// localStorage), re-assert the external_id association so OneSignal knows
// which account this browser belongs to. This matters because:
//   1) Push subscriptions survive across page loads, but OneSignal's cached
//      external_id can drift (e.g. cleared cookies, private window, different
//      profile). Re-calling login on every boot is the pattern OneSignal
//      recommends in their Subscriptions docs.
//   2) The backend targets pushes by external_id = String(userId). If the
//      frontend hasn't told OneSignal who this user is, the push lands on
//      "no valid subscriptions" and the student gets nothing.
// ---------------------------------------------------------------------------
initOneSignal();
try {
  const existingUser = Utils.getStore("user");
  if (existingUser && existingUser.id !== undefined && existingUser.id !== null) {
    loginOneSignal(existingUser.id);
  }
} catch (err) {
  // Never let a OneSignal problem block app boot. Log and keep going.
  console.warn("[OneSignal] bootstrap login skipped:", err);
}

// When a lazy-loaded chunk (JS or CSS) fails to load (e.g. 404 after a new
// deployment), Vite fires this event.  Without a handler the error propagates
// as an unhandled Promise rejection and breaks ALL subsequent router
// navigations, not just the one that triggered the missing file.
// Reloading fetches the latest index.html and its correct asset hashes.
window.addEventListener("vite:preload-error", () => {
  window.location.reload();
});

createApp(App).use(vuetify).use(router).mount("#app");
