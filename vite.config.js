import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { resolve } from "path";
import dns from "dns";

dns.setDefaultResultOrder("verbatim");

// Capacitor builds must use "/" so the WebView can resolve assets.
// The university web deploy keeps "/sev2026/t2/".
const isCapacitor = process.env.CAPACITOR_BUILD === 'true';
const baseURL =
  isCapacitor || process.env.APP_ENV === "development" ? "/" : "/sev2026/t2/";

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    host: "localhost",
    port: 8081,
  },
  base: baseURL,
});