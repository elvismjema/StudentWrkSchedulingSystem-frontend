/**
 * Custom Service Worker — OC Worker Scheduling
 *
 * Uses Workbox via vite-plugin-pwa injectManifest strategy.
 * self.__WB_MANIFEST is replaced at build time with the precache manifest.
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

// Precache all static assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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

// ---------------------------------------------------------------------------
// Push event — show a notification
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Notification", body: event.data.text() };
  }

  const title = data.title || "OC Schedule";
  const options = {
    body: data.body || "",
    icon: "icons/icon-192x192.png",
    badge: "icons/icon-72x72.png",
    tag: data.tag || "oc-schedule",
    data: { url: data.url || "/" },
    requireInteraction: data.requireInteraction === true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click — open or focus the app at the right route
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
