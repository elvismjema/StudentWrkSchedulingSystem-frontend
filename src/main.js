import { createApp } from "vue";
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
// We deliberately do NOT use vite-plugin-pwa's `registerSW` helper. Its
// generated runtime wires an `activated` listener on the Workbox instance
// that force-reloads the page whenever a new SW activates with isUpdate or
// isExternal set — and there is no public option to disable it, overriding
// onNeedRefresh/onRegisteredSW does not turn it off. OneSignal's CDN-hosted
// SW module (imported via importScripts at the top of src/sw.js) can return
// slightly different bytes between fetches, which makes the browser treat
// every navigation as a SW update, which in turn fires the reload listener,
// which logs the user out, which reloads again — the observed loop.
//
// Registering the same sw.js manually gives us SW registration (required so
// iOS PWAs can subscribe to push) without any auto-reload behavior. New SW
// versions still install in the background and take control on the next
// natural tab close/reopen, which is the standard PWA lifecycle.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sev2026/t2/sw.js", { scope: "/sev2026/t2/" })
    .catch((err) => {
      console.warn("[SW] registration failed:", err);
    });
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
//
// Guard against a reload loop: if a stale index.html is still being served
// (CDN/cache lag) after deploy, the freshly-loaded page will 404 on the same
// chunk and trigger another preload-error → reload → preload-error cycle. We
// allow exactly one reload per tab session; if it happens again, we log it
// and leave the page alone so the user can see what broke instead of being
// trapped in a refresh loop.
window.addEventListener("vite:preload-error", () => {
  try {
    if (sessionStorage.getItem("vite-preload-reloaded") === "1") {
      console.warn(
        "[vite] preload error after reload — skipping auto-reload to avoid loop"
      );
      return;
    }
    sessionStorage.setItem("vite-preload-reloaded", "1");
  } catch (_) {
    // sessionStorage unavailable (e.g. private mode) — fall through to reload
  }
  window.location.reload();
});

createApp(App).use(vuetify).use(router).mount("#app");
