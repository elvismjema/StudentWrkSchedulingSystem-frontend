/**
 * Custom Service Worker — OC Worker Scheduling
 *
 * Uses Workbox via vite-plugin-pwa injectManifest strategy.
 * self.__WB_MANIFEST is replaced at build time with the precache manifest.
 *
 * Push delivery: we import the OneSignal SW module at the TOP of this file so
 * OneSignal's push / notificationclick handlers are registered first. Only
 * one service worker can control a given scope (/sev2026/t2/), and OneSignal
 * needs to be inside whatever SW is registered here or its pushes never
 * render. See https://documentation.onesignal.com/docs/onesignal-service-worker
 * ("Combining multiple service workers"). We removed our own custom push /
 * notificationclick listeners along with this change — OneSignal's module
 * handles both for OneSignal-sent notifications, and we no longer have any
 * non-OneSignal push traffic to serve.
 */

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

// Precache all static assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// Immediate activation of new SW versions.
//
// Without these two calls, a freshly-installed SW stays in the 'waiting'
// state until every open tab/window controlled by the old SW is closed.
// In practice that meant users kept running the previous bundle for days
// after a deploy — e.g. the Schedule page still landing on Open Shifts
// after the default was flipped to My Shifts, because their browser was
// still serving the pre-fix chunk out of the old SW's precache.
//
// skipWaiting() lets the new SW activate as soon as install finishes;
// clients.claim() then takes control of existing pages on the next
// navigation so the first post-deploy refresh serves new chunks.
// ---------------------------------------------------------------------------
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first for all API calls (/workerscheduling-t2/...)
registerRoute(
  ({ url }) => url.pathname.startsWith("/workerscheduling-t2"),
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [],
  }),
);

// SPA navigation fallback → serve index.html for all non-API routes
const handler = createHandlerBoundToURL("index.html");
registerRoute(
  new NavigationRoute(handler, {
    denylist: [/^\/workerscheduling-t2/],
  }),
);

// Push event + notificationclick handlers are provided by the OneSignal SW
// module imported at the top of this file. We intentionally do NOT register
// our own here — two handlers would race, and we have no non-OneSignal push
// traffic anymore. If we ever need to customize rendering beyond what
// OneSignal's REST API payload supports, add a `web_buttons` array in the
// backend notificationService payload instead of intercepting the push event.
