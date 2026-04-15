import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";
import dns from "dns";

dns.setDefaultResultOrder("verbatim");

const baseURL =
  process.env.APP_ENV === "development" ? "/" : "/sev2026/t2/";

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Cache all static assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Don't precache API calls
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: "OC Worker Scheduling",
        short_name: "OC Schedule",
        description: "Student Worker Scheduling System — Oklahoma Christian University",
        theme_color: "#80162B",
        background_color: "#80162B",
        display: "standalone",
        orientation: "portrait",
        scope: baseURL,
        start_url: baseURL,
        icons: [
          { src: "icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
          { src: "icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
          { src: "icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
          { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
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