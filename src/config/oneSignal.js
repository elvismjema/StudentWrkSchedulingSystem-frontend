// ---------------------------------------------------------------------------
// OneSignal Web SDK v16 integration layer.
//
// Thin wrapper around the OneSignal Web SDK so the rest of the app talks to a
// small, stable surface instead of the global `window.OneSignalDeferred` queue.
// Every function here is safe to call before the SDK script has actually
// loaded — each one pushes onto OneSignalDeferred, which the SDK drains after
// it finishes bootstrapping.
//
// Why a global <script> tag + OneSignalDeferred instead of an npm package?
// That is the officially-supported integration path on v16 (see
// https://documentation.onesignal.com/docs/web-sdk-setup). The SDK self-hosts
// its runtime on OneSignal's CDN and expects to run as a page script so it
// can read document state before Vue ever mounts.
//
// Matching frontend ↔ backend:
//   frontend: OneSignal.login(String(user.id))
//   backend : POST /notifications { include_aliases: { external_id: [String(userId)] } }
// The String() conversion on BOTH sides is load-bearing — OneSignal stores
// external_id as a string, and a number/string mismatch silently misses.
// ---------------------------------------------------------------------------

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const BASE_URL = import.meta.env.BASE_URL || "/";

/** Write a debug entry to localStorage for diagnosis without remote devtools. */
function _writeDebug(entry) {
  try {
    const raw = localStorage.getItem("_onesignal_debug") || "[]";
    const log = JSON.parse(raw);
    log.push({ ts: new Date().toISOString(), appId: APP_ID ? APP_ID.slice(0, 8) + "…" : "MISSING", ...entry });
    // Keep last 20 entries.
    localStorage.setItem("_onesignal_debug", JSON.stringify(log.slice(-20)));
  } catch { /* never block the caller */ }
}

/** Read the debug log (call from Settings page to display diagnostics). */
export function readOneSignalDebug() {
  try {
    return JSON.parse(localStorage.getItem("_onesignal_debug") || "[]");
  } catch {
    return [];
  }
}

/**
 * Queue a function to run once the OneSignal SDK has initialized.
 * Safe to call any number of times, before or after init.
 */
function withOneSignal(fn) {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await fn(OneSignal);
    } catch (err) {
      console.error("[OneSignal] deferred callback failed:", err);
    }
  });
}

/**
 * Initialize the OneSignal SDK. Must be called exactly once per page load,
 * as early as possible (we call it from main.js before mounting Vue).
 *
 * Service worker: we host the combined Workbox + OneSignal service worker at
 * /sev2026/t2/sw.js (our existing PWA SW, which importScripts() the OneSignal
 * SW module at the top of the file — see src/sw.js). That keeps both the PWA
 * precache and OneSignal's push handler under the same SW registration, since
 * only one service worker can control a given scope.
 *
 * `serviceWorkerPath` is a path RELATIVE TO SITE ROOT with no leading slash
 * (per OneSignal docs). `serviceWorkerParam.scope` is the absolute URL path
 * the SW controls, and must match our Vite `base` so the SW covers the whole
 * app.
 */
export function initOneSignal(userId = null) {
  if (!APP_ID) {
    console.warn(
      "[OneSignal] VITE_ONESIGNAL_APP_ID is not set; push notifications will be disabled in this build.",
    );
    return;
  }

  // Strip leading slash for serviceWorkerPath ("/sev2026/t2/" -> "sev2026/t2/sw.js")
  // but keep the absolute scope with leading+trailing slash.
  const scope = BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/";
  const swPath = scope.replace(/^\//, "") + "sw.js";

  withOneSignal(async (OneSignal) => {
    // Init and login have independent try/catch so an init error (e.g. called
    // twice on iOS) does not silently suppress the login call.
    try {
      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        autoResubscribe: true,
        serviceWorkerPath: swPath,
        serviceWorkerParam: { scope },
      });
      _writeDebug({ step: "init", ok: true });
    } catch (err) {
      console.error("[OneSignal] init failed:", err);
      _writeDebug({ step: "init", ok: false, error: String(err) });
      // Don't return — attempt login anyway. Init is idempotent; if it threw
      // because it was already called, the SDK is still usable.
    }
    if (userId !== null && userId !== undefined) {
      try {
        await OneSignal.login(String(userId));
        _writeDebug({ step: "login", ok: true, userId: String(userId) });
      } catch (err) {
        console.error("[OneSignal] login failed:", err);
        _writeDebug({ step: "login", ok: false, userId: String(userId), error: String(err) });
      }
    }
  });
}

/**
 * Associate the current push subscription with a user identified by our
 * primary-key userId. Matches how the backend targets pushes:
 *   include_aliases: { external_id: [String(userId)] }
 *
 * Idempotent — calling login() with the same external_id twice is a no-op,
 * and calling it with a different external_id switches the subscription to
 * the new user (per OneSignal docs).
 */
export function loginOneSignal(userId) {
  if (!APP_ID || userId === undefined || userId === null) return;
  const externalId = String(userId);
  withOneSignal(async (OneSignal) => {
    try {
      await OneSignal.login(externalId);
      _writeDebug({ step: "loginOneSignal", ok: true, userId: externalId });
    } catch (err) {
      console.error("[OneSignal] loginOneSignal failed:", err);
      _writeDebug({ step: "loginOneSignal", ok: false, userId: externalId, error: String(err) });
    }
  });
}

/**
 * Break the link between the current browser and the previously-logged-in
 * user's external_id. Call this on sign-out so the next student who logs in
 * on the same device doesn't receive the previous student's push notifications.
 */
export function logoutOneSignal() {
  if (!APP_ID) return;
  withOneSignal(async (OneSignal) => {
    await OneSignal.logout();
  });
}

/**
 * Ask the browser for notification permission (via OneSignal) and flip the
 * current subscription to opted-in.
 *
 * Per OneSignal v16 docs, optIn() will itself trigger the permission prompt
 * when the subscription has no valid push token yet — we do NOT need to call
 * Notification.requestPermission() separately. That matters on iOS Safari,
 * where permission prompts MUST be invoked from within a user gesture; the
 * OneSignal SDK preserves the gesture through optIn().
 *
 * Resolves to true if the subscription ends up opted-in, false if the user
 * declined or the browser doesn't support push.
 */
export function optInPush() {
  return new Promise((resolve, reject) => {
    if (!APP_ID) {
      resolve(false);
      return;
    }
    withOneSignal(async (OneSignal) => {
      try {
        // OneSignal v16: optIn() displays the permission prompt when needed,
        // then flips the subscription status to opted-in when permission is
        // granted. Returns void — we check `optedIn` afterwards to report
        // back to the caller.
        await OneSignal.User.PushSubscription.optIn();
        // Give the SDK a tick to update state after the permission response.
        await new Promise((r) => setTimeout(r, 0));
        resolve(Boolean(OneSignal.User.PushSubscription.optedIn));
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Flip the current subscription to opted-out. The underlying push token
 * stays valid in the browser so a future optIn() can re-enable delivery
 * without another permission prompt.
 */
export function optOutPush() {
  return new Promise((resolve, reject) => {
    if (!APP_ID) {
      resolve(false);
      return;
    }
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.User.PushSubscription.optOut();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Read the current opt-in state from OneSignal.
 * Resolves to a boolean; never throws (returns false on error or missing SDK).
 */
export function isPushOptedIn() {
  return new Promise((resolve) => {
    if (!APP_ID) {
      resolve(false);
      return;
    }
    withOneSignal(async (OneSignal) => {
      try {
        resolve(Boolean(OneSignal.User.PushSubscription.optedIn));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Whether this browser supports the underlying Web Push APIs OneSignal needs.
 * Used by the UI to hide the push toggle entirely on unsupported browsers.
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}
