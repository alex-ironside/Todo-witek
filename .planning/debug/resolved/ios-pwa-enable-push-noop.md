---
slug: ios-pwa-enable-push-noop
status: resolved
trigger: Enable push button doesn't do anything on installed PWA on iPhone
created: 2026-05-04
updated: 2026-05-04
resolved_commits:
  - 15bd4a2 fix(push): handle 'default' permission so iOS button re-enables
  - 2bdf834 fix(push): invoke permission call before setState to preserve iOS gesture
  - 3a77317 fix(push): give FCM SW its own scope and dedupe registration
  - 9492bdd fix(push): surface mount-time token-fetch errors instead of swallowing
---

# iOS PWA "Enable push" button does nothing

## Symptoms

- **Expected:** Tapping "Enable push" on installed iOS PWA triggers iOS permission prompt, then registers FCM token in Firestore.
- **Actual:** Nothing visible happens. No permission prompt, no error, no token saved.
- **Errors:** None reported (no surfaced UI error).
- **Timeline:** Push works in desktop/Android browser. Has NOT worked on the installed iPhone PWA (Safari Add-to-Home-Screen).
- **Environment:** iOS 16.4+ (push for web supported), launched as installed PWA from Home Screen.
- **Reproduction:** Open installed PWA on iPhone Home Screen → tap "Enable push" button → no UI feedback, no token saved.

## Suspected scope

- `src/components/*` — push enable button handler (likely in a Settings/Profile component or App shell)
- `src/firebase/messaging.ts` — FCM init / `getToken` wrapper, VAPID key passing
- `src/firebase/pushTokens.ts` — token persistence to Firestore
- `public/firebase-messaging-sw.js` — FCM background SW (was just modified per recent commit `fix(push): set vapidKey + populate FCM service worker config`)
- vite-plugin-pwa SW interaction with FCM SW (scope conflicts on iOS PWAs are a known footgun)

## Known iOS PWA push gotchas

- iOS only delivers push to **installed** (Add-to-Home-Screen) PWAs, not Safari tabs.
- `Notification.requestPermission()` MUST be called inside a user-gesture handler (no awaits before it on some iOS versions).
- iOS PWAs run a separate WebKit storage partition from Safari — token from browser does NOT carry over.
- Service worker scope must cover the page; FCM SW at `/firebase-messaging-sw.js` competing with vite-plugin-pwa SW can cause `getToken` to silently no-op.
- `getToken` requires `serviceWorkerRegistration` argument on iOS PWAs in many setups; missing/wrong VAPID key causes silent failure.
- Recent commit (`1cd14b3`) set vapidKey and populated FCM SW config — investigate whether this fix actually reached the deployed installed-PWA build (PWAs cache aggressively; user may be on stale SW).

## Current Focus

- **hypothesis:** Cluster of four issues. Primary user-visible symptom is caused by `enable()` silently returning when `Notification.requestPermission()` resolves to `'default'` (e.g. iOS dismissed the prompt or never showed it because a prior call consumed the gesture). Status sticks at `'requesting'`, button stays disabled, no error surfaces. Three additional latent issues prevent push from working even after the prompt is fixed.
- **next_action:** Apply fix cluster (handle `'default'`, restructure gesture chain, dedupe SW registration, drop mount-time SW register).
- **test:** TDD — add failing test for `'default'` → status returns to `'idle'`, then implement.
- **expecting:** After fix, button on iOS PWA shows permission prompt; on grant, token registers in Firestore; on dismiss/default, status returns to idle (button re-enables).

## Evidence

- timestamp: 2026-05-04
  finding: **F1 (CONFIRMED, primary symptom).** `src/hooks/usePushNotifications.ts:71-85` — `enable()` calls `setStatus('requesting')`, then awaits `requestNotificationPermission()`. On line 75: `if (permission !== 'granted') { return; }` returns silently when permission is `'default'`. Status stays `'requesting'` → button is `disabled` (PushToggle line 24) → no UI feedback, no error message. This perfectly matches user observation: "no prompt visible, no error, button does nothing." iOS commonly resolves `requestPermission()` to `'default'` when the gesture was lost or the system suppressed the sheet.

- timestamp: 2026-05-04
  finding: **F2 (suspected, iOS-specific).** User-gesture chain is fragile. `enable` is `async` and performs `setStatus('requesting')` (synchronous) before `await requestNotificationPermission()` (which is itself async, branches on `Notification.permission`, then calls `Notification.requestPermission()`). iOS WebKit is the strictest browser about preserving user-gesture across microtasks; the React state update + nested async call increases risk that WebKit considers the gesture consumed by the time `Notification.requestPermission()` is invoked. Robust pattern: call `Notification.requestPermission()` synchronously as the FIRST statement in the click handler, then update state and do SW work afterward.

- timestamp: 2026-05-04
  finding: **F3 (suspected, silent-fail path).** SW scope collision. `vite.config.ts` registers vite-plugin-pwa workbox SW with scope `/todo-witek/` (auto-update). `src/firebase/pushTokens.ts:13-16` and `:33-36` re-register `firebase-messaging-sw.js` at the same scope `/todo-witek/` on every `enable` AND on every mount-time `getCurrentDeviceToken`. iOS WebKit returns the existing workbox registration (or replaces FCM with workbox), so `getToken(messaging, { serviceWorkerRegistration })` attaches the FCM push subscription to a SW that has no `firebase.messaging()` handler — token issuance silently returns null. Even if F1/F2 are fixed, push delivery would still fail.

- timestamp: 2026-05-04
  finding: **F4 (suspected, secondary symptom).** `src/hooks/usePushNotifications.ts:44-49` — mount-time `getCurrentDeviceToken` registers the FCM SW unconditionally when `Notification.permission === 'granted'`. Hits the same scope-collision path as F3, returns null silently, leaving status at `'idle'` even on devices that previously enabled push. The `.then((t) => ...)` has no `.catch`, so any rejection is swallowed entirely.

- timestamp: 2026-05-04
  finding: **Ruled out (c) from triage:** `src/App.tsx:124,138` mounts a single `PushToggle`. `src/firebase/config.ts:19` has a non-empty `vapidKey`. Recent commit `1cd14b3` populated `public/firebase-messaging-sw.js` with valid Firebase config. So the button rendering branch IS the push-enable button (not `unconfigured`/`unsupported`). The user is definitely tapping the right button.

- timestamp: 2026-05-04
  finding: **Note on stale-SW theory:** With `registerType: 'autoUpdate'` and a recent deploy, the workbox SW should self-update on next visit. Stale SW is unlikely to be the cause vs. F1–F4 which are deterministic from the current source.

## Eliminated

- VAPID key empty (fixed in commit `1cd14b3`, asserted by `src/firebase/config.test.ts`).
- Firebase SW config empty (fixed in same commit).
- Multiple/wrong push button rendered — confirmed only one `PushToggle` in `App.tsx`.
- Stale cached SW — possible but not necessary to explain symptoms; F1 explains them deterministically from source.

## Resolution

### Root cause (cluster)

Four interacting issues. F1 is the user-visible silent-fail; F2–F4 are latent and would still block push delivery after F1 is fixed.

1. **F1 — `enable()` silent return on `'default'`** (`src/hooks/usePushNotifications.ts:75`). Status sticks at `'requesting'`, button stays disabled.
2. **F2 — gesture-chain fragility on iOS.** `setStatus` before `await requestNotificationPermission()`; nested async layers between click and `Notification.requestPermission()`.
3. **F3 — SW scope collision.** FCM SW re-registered at the same scope as workbox SW; `getToken` attaches to wrong SW.
4. **F4 — mount-time SW registration with swallowed errors** in `getCurrentDeviceToken`.

### Fix direction

- **F1:** Handle `'default'` explicitly in `enable()` → `setStatus('idle')` and surface a one-line message.
- **F2:** Restructure `enable()` so `Notification.requestPermission()` is invoked first (move the supported-check + early-grant short-circuit out of the async wrapper, or invoke `Notification.requestPermission()` directly from the click handler before any other awaits).
- **F3:** Register the FCM SW once (at module load, or use `navigator.serviceWorker.getRegistration(swUrl)` first to avoid re-registering); cache the registration. Either give the FCM SW a distinct scope (e.g. `/todo-witek/fcm/`) by serving it from a subpath, OR ensure the FCM SW is registered BEFORE the workbox SW takes over its scope. Document the manual iOS test.
- **F4:** Drop SW registration from `getCurrentDeviceToken`'s mount path; reuse the cached registration from F3. Add a `.catch` so any failure surfaces as `'error'`, not silent.

### TDD plan (per CLAUDE.md)

- New test `usePushNotifications.test.tsx`: when `requestNotificationPermission` resolves `'default'`, status goes back to `'idle'` (not stuck at `'requesting'`). RED first, then implement.
- F2/F3/F4 require manual iOS verification on installed PWA after deploy — document in the commit body.
