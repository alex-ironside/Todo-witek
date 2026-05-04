---
slug: push-broken-after-acct-switch
status: resolved
trigger: |
  After logging in to a different account, the "enable push" button doesn't work.
  Repro: enabled push on account A → logged out → logged in to account B →
  "enable push" button did nothing. Started working only after reinstalling the PWA.
created: 2026-05-04T08:33:51Z
updated: 2026-05-04T08:39:10Z
---

# Debug Session: push-broken-after-acct-switch

## Symptoms

- **Expected:** After logging out of account A and into account B, clicking
  "enable push" should request/refresh the FCM token and register it under
  account B, enabling push notifications for B.
- **Actual:** The "enable push" button does nothing visible after the account
  switch. Push remains non-functional for account B.
- **Errors:** Likely silent `permission-denied` from Firestore on the
  `setDoc(fcmTokens/{token}, …)` write. Surfaces as `status='error'` in the
  hook, which `PushToggle` doesn't render distinctly — the button just snaps
  back to "Enable push" with no visible change.
- **Timeline:** Surfaced after recent push-related commits 938b1b1
  (mount-time token-fetch errors), 0116eec (FCM SW scope + dedupe
  registration), 5f7601a (permission call before setState).
- **Reproduction:**
  1. Log in as account A in the deployed PWA.
  2. Enable push (button works, token saved).
  3. Log out, log in as account B.
  4. Click "enable push" → no effect.
  5. Uninstall + reinstall PWA → button works again for B.

## Suspected area

- `src/firebase/messaging.ts` — FCM init / `getToken` / SW registration dedupe.
- `src/firebase/pushTokens.ts` — token persistence keyed by user.
- `src/hooks/usePushNotifications.ts` — auth state change handling around push UI.
- `public/firebase-messaging-sw.js` — SW scope/lifecycle across user sessions.

## Current Focus

- hypothesis: REJECTED. Module-level FCM-SW registration cache in
  `pushTokens.ts` is real (`_fcmSwRegistration`) but not the cause — it
  caches a `ServiceWorkerRegistration`, not a token, and the FCM SDK is the
  one that returns a stable per-device token regardless of cache state.
- Replaced with: `firestore.rules` denies cross-user updates to
  `fcmTokens/{tokenId}`, and account A's logout leaves the device's token
  doc owned by A. When account B re-registers on the same device, FCM
  returns the same token, and the resulting `setDoc` is evaluated as an
  `update` of an A-owned doc → blocked by `allow update: if false`.
- next_action: (resolved)

## Evidence

- timestamp: 2026-05-04T08:35Z
  source: `firestore.rules` lines 27–33
  finding: |
    `match /fcmTokens/{tokenId}` allows `read, delete` only when
    `resource.data.userId == request.auth.uid`, allows `create` only when
    `request.resource.data.userId == request.auth.uid`, and explicitly
    `allow update: if false`. This means once a token doc is written for
    account A, no other account can overwrite it via `setDoc` (which the
    Firestore SDK evaluates as `update` when the doc exists).
- timestamp: 2026-05-04T08:35Z
  source: `src/firebase/pushTokens.ts:30-43`
  finding: |
    `registerCurrentDeviceForPush(userId)` always calls `setDoc` against
    `fcmTokens/{token}`. There is no pre-delete or `userId`-equality check;
    when the token doc already exists with a different `userId`, the write
    fails with permission-denied at the rules layer.
- timestamp: 2026-05-04T08:35Z
  source: `src/hooks/usePushNotifications.ts:76-96`
  finding: |
    `enable()` swallows the rejected `setDoc` into `status='error'` plus an
    `errorMessage`. `PushToggle` (`src/components/PushToggle.tsx:9-34`) only
    branches on `unconfigured | unsupported | denied | enabled`; for
    `error` it falls through to the default "Enable push" + "Push not
    enabled" rendering. To the user, the button "did nothing".
- timestamp: 2026-05-04T08:35Z
  source: `src/App.tsx:135` (pre-fix)
  finding: |
    `signOut={() => logout()}` does no push cleanup. Account A's
    `fcmTokens/{tokenA}` remains in Firestore after logout, owned by A.
- timestamp: 2026-05-04T08:35Z
  source: PWA reinstall behavior
  finding: |
    Reinstalling the PWA wipes the FCM service worker registration and
    associated push subscription identity, so the next `getToken()` issues
    a new token T_B. `setDoc(fcmTokens/T_B, …)` is then a `create` →
    allowed → push works for B. This explains why reinstall is the only
    workaround.

## Eliminated

- Module-level token / SW cache surviving across logout: the only
  module-level cache is `_fcmSwRegistration` (a `ServiceWorkerRegistration`
  promise). It does not influence which token FCM returns and is not
  per-user.
- UI gating on a stale `pushEnabled` flag: `PushToggle` derives directly
  from `status`; there is no localStorage or cross-user persisted flag.
- `getCurrentDeviceToken('B')` failing at mount: with `persistentLocalCache`
  Firestore serves the cached doc and returns `null` from the userId
  inequality check; mount goes to `idle` (not `error`). The visible failure
  is the click handler, not the mount.

## Resolution

- root_cause: |
  Firestore security rule `match /fcmTokens/{tokenId} { allow update: if
  false }` correctly forbids cross-user overwrites of FCM token docs, but
  the app does nothing on logout to delete the device's token doc. After
  account A logs out, doc `fcmTokens/{tokenA}` remains owned by A. When
  account B logs in on the same device, FCM returns the same token T_A;
  `registerCurrentDeviceForPush(B)` calls `setDoc(fcmTokens/T_A, {userId:
  B,…})`, which Firestore evaluates as an `update` of an A-owned doc and
  rejects. The rejection is captured into `status='error'`, but
  `PushToggle` has no visual for `error`, so the button silently snaps
  back to "Enable push" — looking like a no-op. PWA reinstall wipes the
  FCM SW and forces a brand-new token (T_B), turning the next `setDoc`
  into a `create`, which is permitted → push works again.
- fix: |
  In `src/App.tsx`, the `signOut` callback now disables push before
  logging out:

      signOut={async () => { await push.disable(); await logout(); }}

  `usePushNotifications.disable()` early-returns when `!token`, so it is a
  safe no-op for users who never enabled push. When push was active,
  `disable()` calls `unregisterDeviceToken(token)` (a `delete` on
  `fcmTokens/{token}`), which the rule allows because the doc is still
  owned by the currently-authenticated user. The next account to register
  on the same device hits a `create` path and is allowed by the rules.

  We deliberately did NOT weaken `firestore.rules` — keeping
  `update: if false` prevents any signed-in user from hijacking another's
  push subscription by guessing/learning a token.

  Defensive follow-ups intentionally deferred (out of scope, no current
  symptom): (a) calling FCM `deleteToken()` to force a fresh token after
  disable, (b) adding a visible UI state for `status='error'` in
  `PushToggle` so future regressions in this code path are not silent.
- verified_by: |
  TDD per CLAUDE.md. Two new tests in `src/App.test.tsx`:
    * "calls push.disable() before logout() so the FCM token doc is removed
      while still authenticated" — asserts call order via
      `mock.invocationCallOrder`. Failed before the fix
      (`expected "spy" to be called 1 times, but got 0 times`); passes
      after.
    * "still logs out when push is unconfigured (disable is a no-op)" —
      asserts the cleanup path doesn't break the no-push case.
  Full suite: `npm test --run` → 136 passed (was 134); `npm run typecheck`
  → clean; `npm run build` → clean.
- prevention: |
  Auth-scoped resources written through Firestore rules that pin ownership
  must have an explicit teardown in the logout path. Add an
  ownership-cleanup checklist for any future per-user device resource
  (e.g. a future presence doc, ephemeral session doc): if the rule denies
  cross-user `update`, then logout must `delete` it while the user is
  still authenticated.
