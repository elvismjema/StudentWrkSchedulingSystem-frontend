/**
 * Push Notification Service
 *
 * Thin compatibility layer over the OneSignal Web SDK. Keeps the same named
 * exports the rest of the app (StudentSettings.vue, etc.) already imports, so
 * switching from the VAPID/web-push + custom-backend-storage flow to OneSignal
 * is a drop-in change at the call sites.
 *
 * Responsibilities:
 *   - subscribeToPush()        -> optIn() via OneSignal (also displays the
 *                                 browser permission prompt when needed)
 *   - unsubscribeFromPush()    -> optOut() via OneSignal
 *   - getCurrentSubscription() -> read OneSignal.User.PushSubscription.optedIn
 *   - sendTestPush()           -> unchanged; backend test endpoint now routes
 *                                 through OneSignal server-side
 *   - isPushSupported()        -> re-exported from oneSignal.js
 *
 * What we DROPPED vs the previous VAPID flow:
 *   - No more /push-subscriptions POST / DELETE. OneSignal owns subscription
 *     storage, iOS PWA quirks, and retry/pruning. The legacy PushSubscription
 *     table on the backend stays in place but is no longer written to.
 *   - No more /push-subscriptions/vapid-public-key fetch.
 *   - No more pushManager.subscribe() dance, no more manual service worker
 *     registration race handling (OneSignal's SW module is now part of our
 *     sw.js via importScripts).
 */
import apiClient from "./services.js";
import {
  optInPush,
  optOutPush,
  isPushOptedIn,
  isPushSupported as _isPushSupported,
} from "../config/oneSignal.js";

/** Re-export so StudentSettings.vue's existing import site still resolves. */
export function isPushSupported() {
  return _isPushSupported();
}

/**
 * Returns a truthy value if this device is opted-in to push via OneSignal, or
 * null otherwise. We keep the old "subscription-like" return contract (truthy
 * when enabled, null when not) because the caller in StudentSettings.vue
 * only does `pushEnabled.value = !!sub`.
 */
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  try {
    const optedIn = await isPushOptedIn();
    return optedIn ? { optedIn: true } : null;
  } catch {
    return null;
  }
}

/**
 * Ask OneSignal to opt this device in to push. Shows the browser permission
 * prompt when needed (OneSignal's optIn() triggers it inside the user-gesture
 * context \u2014 critical for iOS Safari / iOS PWA).
 *
 * Returns true when the subscription ends up opted-in, false when the user
 * declined the prompt or the browser doesn't support push. Throws on real
 * failures so the caller can surface the underlying reason to the user.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) return false;

  try {
    return await optInPush();
  } catch (err) {
    // Normalize into a readable error. OneSignal's SDK uses either a
    // permissionBlocked-style string or a plain Error here \u2014 surface the
    // message when we have one.
    const reason = err?.message || err?.name || String(err);
    throw new Error(`OneSignal optIn failed: ${reason}`);
  }
}

/**
 * Ask the backend to fire a canned test push to every device this user has
 * opted in on. Backend routes to OneSignal when configured and returns the
 * structured summary:
 *   { message, sent, failed, pruned, devicesTargeted, failures, skippedReason? }
 * Unchanged from the pre-OneSignal flow \u2014 the endpoint path and response
 * shape are stable across providers.
 */
export async function sendTestPush() {
  const { data } = await apiClient.post("/push-subscriptions/me/test");
  return data;
}

/**
 * Opt this device out of push via OneSignal. The underlying push token stays
 * valid so a future subscribeToPush() can re-enable delivery without another
 * permission prompt. Returns true on success, false if the browser doesn't
 * support push.
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;
  try {
    await optOutPush();
    return true;
  } catch (err) {
    console.error("[PushNotificationService] Unsubscribe error:", err);
    return false;
  }
}
