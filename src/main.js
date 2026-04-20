import { createApp } from "vue";
import App from "./App.vue";
import router from "./router.js";
import vuetify from "./plugins/vuetify.js";
import "./styles/tokens.css";

// When a lazy-loaded chunk (JS or CSS) fails to load (e.g. 404 after a new
// deployment), Vite fires this event.  Without a handler the error propagates
// as an unhandled Promise rejection and breaks ALL subsequent router
// navigations, not just the one that triggered the missing file.
// Reloading fetches the latest index.html and its correct asset hashes.
window.addEventListener("vite:preload-error", () => {
  window.location.reload();
});

createApp(App).use(vuetify).use(router).mount("#app");
