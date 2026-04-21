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
// Service worker activation policy.
//
// We keep skipWaiting() so a freshly-installed SW activates as soon as
// install finishes, rather than sitting in 'waiting' until every controlled
// tab closes. Without it, users kept running the previous bundle for days
// after a deploy.
//
// We intentionally do NOT call clients.claim() here. claim() forces the new
// SW to take control of already-open tabs mid-session \u2014 which, combined
// with vite-plugin-pwa's default auto-reload-on-update behavior, caused
// pages to reload on every deploy and sometimes loop (the OneSignal CDN
// imported via importScripts can return slightly different bytes between
// fetches, so the browser sees 'new SW' repeatedly). Leaving claim() off
// means the new SW takes over on the NEXT natural page load/navigation,
// which is the standard PWA update lifecycle and what the browser does by
// default. Users still get updates promptly \u2014 they just don't get an
// unexpected mid-session refresh.
// ---------------------------------------------------------------------------
self.addEventListener("install", () => {
  self.skipWaiting();
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
