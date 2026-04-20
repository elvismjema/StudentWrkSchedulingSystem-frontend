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
 * Returns true on success, false otherwise.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const vapidPublicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const { endpoint, keys } = subscription.toJSON();
    await apiClient.post("/push-subscriptions", {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return true;
  } catch (err) {
    console.error("[PushNotificationService] Subscribe error:", err);
    return false;
  }
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
