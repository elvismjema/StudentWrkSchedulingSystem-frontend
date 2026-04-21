import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import router from "./router.js";
import vuetify from "./plugins/vuetify.js";
import "./styles/tokens.css";

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
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
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
