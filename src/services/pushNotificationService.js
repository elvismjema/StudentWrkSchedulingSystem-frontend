/**
 * Push Notification Service
 *
 * Handles subscribing/unsubscribing to Web Push and communicating
 * with the backend push-subscriptions API.
 */
import apiClient from "./services.js";

/** Check if this browser supports Web Push. */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Race a promise against a timeout so a hanging browser API can't freeze the UI. */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Convert a base64url VAPID public key to a Uint8Array. */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Fetch the VAPID public key from the backend. */
async function getVapidPublicKey() {
  const { data } = await apiClient.get("/push-subscriptions/vapid-public-key");
  return data.publicKey;
}

/** Return the current PushSubscription (or null if not subscribed). */
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Request permission and subscribe this device to push notifications.
 * Saves the subscription to the backend.
 *
 * Returns true on success.
 * Returns false ONLY for the benign "user-controlled" outcomes:
 *   - browser doesn't support push at all
 *   - user denied / dismissed the permission prompt
 * Throws for anything else (VAPID fetch failed, service worker unavailable,
 * pushManager.subscribe rejected, backend save failed) so the caller can
 * show the underlying reason instead of silently snapping the toggle off.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // Anything below this point is a real failure — let it throw with context.
  let vapidPublicKey;
  try {
    vapidPublicKey = await getVapidPublicKey();
  } catch (err) {
    const status = err?.response?.status;
    throw new Error(
      status === 503
        ? "Server hasn't configured push yet (VAPID keys missing)"
        : `Couldn't reach the push key endpoint${status ? ` (HTTP ${status})` : ""}`,
    );
  }

  let registration;
  try {
    // serviceWorker.ready waits forever if the SW never activates — bound it.
    registration = await withTimeout(
      navigator.serviceWorker.ready,
      10000,
      "Service worker ready",
    );
  } catch (err) {
    // Fallback: the SW may never have been registered at all (iOS PWA race
    // where `load` fires before the auto-registration script runs). Register
    // it explicitly right here, then wait for ready again. If this also
    // times out we give up.
    console.warn(
      "[PushNotificationService] serviceWorker.ready timed out, attempting manual registration...",
      err,
    );
    try {
      const swUrl =
        (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/") + "sw.js";
      const scope = import.meta.env.BASE_URL || "/";
      await navigator.serviceWorker.register(swUrl, { scope });
      registration = await withTimeout(
        navigator.serviceWorker.ready,
        15000,
        "Service worker ready (after manual register)",
      );
    } catch (err2) {
      throw new Error(`Service worker not ready: ${err2?.message || err?.message || "unknown"}`);
    }
  }

  // If a stale subscription already exists (e.g. from before VAPID keys were
  // deployed), pushManager.subscribe can hang or reject. Clear it first so
  // the next subscribe starts from a clean state.
  try {
    const existing = await withTimeout(
      registration.pushManager.getSubscription(),
      5000,
      "Read existing subscription",
    );
    if (existing) {
      await withTimeout(existing.unsubscribe(), 5000, "Clear existing subscription");
    }
  } catch (err) {
    // Non-fatal — log and continue; subscribe() below will try anyway.
    console.warn("[PushNotificationService] Could not clear existing subscription:", err);
  }

  let subscription;
  try {
    subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }),
      15000,
      "pushManager.subscribe",
    );
  } catch (err) {
    // Most common causes on iOS: PWA not installed to Home Screen, or the
    // existing subscription is stale and needs to be cleared first.
    throw new Error(`Browser refused to subscribe: ${err?.message || err?.name || "unknown"}`);
  }

  const { endpoint, keys } = subscription.toJSON();
  try {
    // Backend expects the nested Web Push shape: { endpoint, keys: { p256dh, auth } }.
    // Sending flat fields here silently 400s and leaves the device unsubscribed on
    // the server even though the browser thinks it's subscribed.
    await apiClient.post("/push-subscriptions", {
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    });
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err?.message || "unknown";
    throw new Error(`Backend rejected subscription${status ? ` (HTTP ${status})` : ""}: ${msg}`);
  }

  return true;
}

/**
 * Ask the backend to send a canned test push to every device the current
 * user has subscribed. Returns the backend's delivery summary:
 *   { message, sent, failed, pruned, devicesTargeted, skippedReason? }
 * The caller is expected to surface `message` (the backend already picks
 * a human-friendly string for every outcome). Throws on HTTP error.
 */
export async function sendTestPush() {
  const { data } = await apiClient.post("/push-subscriptions/me/test");
  return data;
}

/**
 * Unsubscribe this device from push notifications and remove from backend.
 * Returns true on success, false otherwise.
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const { endpoint } = subscription.toJSON();
    await subscription.unsubscribe();
    await apiClient.delete("/push-subscriptions", { data: { endpoint } });
    return true;
  } catch (err) {
    console.error("[PushNotificationService] Unsubscribe error:", err);
    return false;
  }
}
