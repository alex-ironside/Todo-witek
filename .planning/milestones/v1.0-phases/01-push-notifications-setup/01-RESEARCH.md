# Phase 1: Push Notifications Setup — Research

**Researched:** 2026-04-27
**Domain:** Firebase Cloud Messaging, React hooks, Vite plugin API, Service Worker config injection
**Confidence:** HIGH (stack locked; code patterns verified against existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Permission requested on button click only — not automatically on login
- Two-step flow: request browser permission first, then register FCM token
- Denied permission shows muted message: "Notifications blocked — enable in browser settings"
- Single toggle control that shows current status (enabled/disabled on this device)
- On opt-out: call `unregisterDeviceToken` to delete FCM token from Firestore
- Always show current push status regardless of toggle state
- Foreground messages displayed as in-app dismissible banner (reuses `.banner.warn` style)
- Banner auto-dismisses after 5 seconds
- `onForegroundMessage` wired up in a new `usePushNotifications` hook called from `FirebaseAuthenticated`

### Claude's Discretion
- Tests for `messaging.ts` and `pushTokens.ts` (currently untested)
- SW config sync approach: build-time Vite plugin or `vite.config.ts` script to inject Firebase config into `public/firebase-messaging-sw.js`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

The phase adds FCM push notification support on top of wrappers that already exist but are untested. The main work is: (1) a `usePushNotifications` hook with a clear state machine, (2) a `PushToggle` component, (3) tests for the two existing Firebase wrappers, (4) a Vite plugin to stamp real Firebase config into the service worker at build time, and (5) removing the auto-permission-request calls that currently fire on mount.

The existing codebase has a clear, consistent pattern for all of this. The hook should follow `useAuth` structure. The wrapper tests should follow `todos.test.ts` pattern. The SW config injection is a small inline Vite plugin using the `writeBundle` hook — this is a Rollup-standard approach that Vite fully supports.

**Primary recommendation:** Build `usePushNotifications` as a pure React hook that delegates all async Firebase calls to the existing wrappers, manages a typed `status` discriminant, owns the foreground banner state and its 5-second timer, and runs the `onForegroundMessage` subscription inside a `useEffect` with the cancellation guard pattern shown below.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FCM token registration | API / Backend (Firebase) | Browser (SW registration trigger) | Token is stored in Firestore; browser only initiates |
| Permission request | Browser / Client | — | `Notification.requestPermission()` is a browser API |
| Token persistence in Firestore | API / Backend (Firebase) | — | `pushTokens.ts` handles Firestore writes |
| Foreground message display | Browser / Client (hook state) | — | Banner state and timer live in `usePushNotifications` |
| Background message display | Browser / Client (SW) | — | `firebase-messaging-sw.js` runs in SW context |
| SW config injection | CDN / Static (build step) | — | SW file is a static asset; must be stamped at build time |
| Toggle opt-in/opt-out | Browser / Client | Firebase (token delete on opt-out) | UI initiates; Firestore owns truth |

---

## Standard Stack

No new packages are needed. All capabilities are covered by existing dependencies.

| Library | Version (installed) | Purpose |
|---------|---------------------|---------|
| `firebase` | ^10.13.0 | FCM messaging, Firestore |
| `react` | ^18.3.1 | Hook and component layer |
| `vitest` | ^2.0.5 | Tests |
| `@testing-library/react` | ^16.0.1 | Hook and component tests |
| `vite` | ^5.4.2 | Build-time plugin for SW injection |

[VERIFIED: package.json in repo root]

**Installation:** No new packages required.

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks toggle
       │
       ▼
  PushToggle (component)
       │  calls enable() / disable()
       ▼
usePushNotifications (hook)   ← owns all push state + banner state
  ├── reads:  Notification.permission
  ├── calls:  requestNotificationPermission()  ← notificationService.ts
  ├── calls:  registerCurrentDeviceForPush()   ← pushTokens.ts
  ├── calls:  unregisterDeviceToken()          ← pushTokens.ts
  ├── calls:  onForegroundMessage()            ← messaging.ts
  │               └── sets bannerMessage state + starts 5s timer
  └── returns: { status, token, errorMessage, bannerMessage,
                 dismissBanner, enable, disable }
       │
       ▼
  FirebaseAuthenticated
  ├── renders <PushToggle status={...} enable={...} disable={...} />
  └── renders bannerMessage && <div class="banner warn">...</div>

Background messages (SW context, separate):
FCM delivery → firebase-messaging-sw.js → showNotification()
```

### Recommended Project Structure

```
src/
  hooks/
    usePushNotifications.ts       ← new
    usePushNotifications.test.tsx ← new (co-located)
  components/
    PushToggle.tsx                ← new
    PushToggle.test.tsx           ← new (co-located)
  firebase/
    messaging.ts                  ← exists; add messaging.test.ts
    messaging.test.ts             ← new
    pushTokens.ts                 ← exists; add pushTokens.test.ts
    pushTokens.test.ts            ← new
public/
  firebase-messaging-sw.js        ← fix config injection (build-time)
vite.config.ts                    ← add inline SW stamp plugin
```

### Pattern 1: usePushNotifications State Machine

The hook returns a typed `status` discriminant the component uses to render branches. The hook also owns the foreground banner state and timer. This is the complete state surface the planner must implement.

```typescript
// src/hooks/usePushNotifications.ts

export type PushStatus =
  | 'unsupported'   // Notification API or FCM not available in this browser
  | 'unconfigured'  // vapidKey is empty — push not set up for this deployment
  | 'idle'          // Notification.permission === 'default', user hasn't decided
  | 'requesting'    // Permission prompt is open
  | 'denied'        // Notification.permission === 'denied'
  | 'registering'   // Permission granted, getToken/setDoc in flight
  | 'enabled'       // Token saved in Firestore; push active on this device
  | 'disabled'      // User opted out (token deleted); permission still granted
  | 'error';        // Last operation failed

export interface PushState {
  status: PushStatus;
  token: string | null;
  errorMessage: string | null;
  // Foreground message banner — hook owns the timer
  bannerMessage: string | null;
  dismissBanner: () => void;
  // Actions
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}
```

**State transitions:**

```
initial read of Notification.permission
  'default' → 'idle'
  'denied'  → 'denied'
  'granted' + no cached token → 'idle'   (see Open Question 2 re: persistence)
  'granted' + cached token    → 'enabled' (requires localStorage — see A3)

enable():
  'idle'     → 'requesting' → (granted?) → 'registering' → 'enabled' | 'error'
  'idle'     → 'requesting' → (denied?)  → 'denied'
  'disabled' → 'registering' → 'enabled' | 'error'

disable():
  'enabled' → 'disabled' (deleteDoc on current token)
```

**IMPORTANT — dependency on Open Question 2:** The `'enabled'` state on mount requires a persistence mechanism (localStorage or equivalent) to know whether this device has a registered token after a page reload. If Open Question 2 is resolved in favour of "no persistence / always show `idle` on reload", then `'enabled'` is only reachable after an explicit `enable()` call in the same session — never on mount. The planner must resolve Open Question 2 before implementing the mount logic.

**Initial state determination at mount:**

```typescript
useEffect(() => {
  if (!vapidKey) { setStatus('unconfigured'); return; }
  if (!('Notification' in window)) { setStatus('unsupported'); return; }
  const perm = Notification.permission;
  if (perm === 'denied') { setStatus('denied'); return; }
  // If localStorage has a cached token for this user, restore 'enabled'.
  // Otherwise show 'idle' — user must click the toggle to enable.
  const cached = localStorage.getItem(`fcm-token:${userId}`);
  setStatus(cached ? 'enabled' : 'idle');
  if (cached) setToken(cached);
}, [userId]);
```

Note: The hook does NOT re-register a token on mount if permission is already granted. That would violate the "on button click only" constraint.

### Pattern 2: onForegroundMessage Cleanup (async Unsubscribe)

`onForegroundMessage` returns `Promise<Unsubscribe>` — the unsubscribe must be guarded against unmount-before-resolve (common under React StrictMode double-mount). The banner state is set inside the handler; the hook owns it.

```typescript
// Source: derived from messaging.ts return type — Unsubscribe = () => void
useEffect(() => {
  let unsub: () => void = () => {};
  let cancelled = false;

  onForegroundMessage((payload) => {
    setBannerMessage(payload.notification?.title ?? 'New notification');
  }).then((off) => {
    if (cancelled) {
      off(); // already unmounted — immediately release
    } else {
      unsub = off;
    }
  });

  return () => {
    cancelled = true;
    unsub();
  };
}, []);
```

[VERIFIED: messaging.ts return type is `Promise<Unsubscribe>` — confirmed by reading source]

### Pattern 3: Foreground Banner (5-second auto-dismiss, hook-owned)

The 5-second timer lives inside the hook, keyed on `bannerMessage`. The component receives `bannerMessage` and `dismissBanner` as hook return values and renders them as pure state — no timer logic in the component.

```typescript
// Inside usePushNotifications hook
const [bannerMessage, setBannerMessage] = useState<string | null>(null);
const dismissBanner = useCallback(() => setBannerMessage(null), []);

useEffect(() => {
  if (!bannerMessage) return;
  const id = setTimeout(() => setBannerMessage(null), 5000);
  return () => clearTimeout(id);
}, [bannerMessage]);
```

The planner must use `vi.useFakeTimers()` in the hook test (R-10) to advance the 5-second timer without waiting. Banner state is testable via `renderHook` — no component needed.

### Pattern 4: Removing Auto Permission Request

`LocalApp` and `FirebaseApp` both call `requestNotificationPermission()` on mount. The CONTEXT.md scope is Firebase-mode only. Actions:

- **FirebaseApp:** Remove the `useEffect` that calls `requestNotificationPermission()` on `user` change. [LOCKED by CONTEXT]
- **LocalApp:** CONTEXT does not address this. See Open Questions — this needs explicit user decision before the planner touches it.

### Anti-Patterns to Avoid

- **Importing `firebase/messaging` outside `src/firebase/`:** All FCM calls must go through `messaging.ts`. The hook imports from `../firebase/messaging`, not `firebase/messaging`.
- **Calling `registerCurrentDeviceForPush` on mount:** This was the old pattern in App.tsx. Must never auto-register.
- **Returning `null` from `onForegroundMessage` without cleanup:** The wrapper returns `Promise<Unsubscribe>` — always await or use the cancellation guard.
- **Re-requesting permission when status is `denied`:** `Notification.requestPermission()` returns immediately with `'denied'` if already denied; UI should show the muted message and not prompt again.
- **Banner state in the component:** Putting the timer in `FirebaseAuthenticated` instead of the hook makes the banner untestable without rendering the full component tree.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FCM token acquisition | Custom fetch to FCM API | `getFcmToken` in `messaging.ts` | Handles VAPID key, SW registration, caching |
| Token Firestore CRUD | Direct `setDoc`/`deleteDoc` in hook | `registerCurrentDeviceForPush` / `unregisterDeviceToken` | Wrappers are the seam for tests |
| Permission request | `Notification.requestPermission()` in hook | `requestNotificationPermission` in `notificationService.ts` | Handles `unsupported` fallback |
| SW config injection | Manual copy-paste of config into SW file | Vite `writeBundle` plugin (see below) | Keeps single source of truth in `config.ts` |

---

## SW Config Injection — Recommendation

**Approach: Inline Vite plugin with `writeBundle` hook**

The `writeBundle` hook runs after all output files are written to `dist/`. It can read and rewrite `dist/firebase-messaging-sw.js` using Node `fs`. This is a standard Rollup/Vite pattern. [VERIFIED: Vite plugin API docs at vite.dev/guide/api-plugin confirm `writeBundle` runs post-write]

The `public/firebase-messaging-sw.js` is copied verbatim to `dist/` by Vite (public files are not transformed). The plugin stamps the config into the copied file after the build.

```typescript
// vite.config.ts — add this plugin inline before VitePWA in the plugins array
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { firebaseConfig } from './src/firebase/config';

function stampFirebaseSwPlugin() {
  return {
    name: 'stamp-firebase-sw',
    writeBundle({ dir }: { dir?: string }) {
      const outDir = dir ?? 'dist';
      const swPath = resolve(outDir, 'firebase-messaging-sw.js');
      let src = readFileSync(swPath, 'utf-8');
      src = src
        .replace("apiKey: ''", `apiKey: '${firebaseConfig.apiKey}'`)
        .replace("authDomain: ''", `authDomain: '${firebaseConfig.authDomain}'`)
        .replace("projectId: ''", `projectId: '${firebaseConfig.projectId}'`)
        .replace("storageBucket: ''", `storageBucket: '${firebaseConfig.storageBucket}'`)
        .replace("messagingSenderId: ''", `messagingSenderId: '${firebaseConfig.messagingSenderId}'`)
        .replace("appId: ''", `appId: '${firebaseConfig.appId}'`);
      writeFileSync(swPath, src, 'utf-8');
    },
  };
}
```

[ASSUMED: A1] The TypeScript import of `src/firebase/config.ts` in `vite.config.ts` works because Vite's config file supports TypeScript imports via Vite's own TS transform. This is the standard pattern but was not verified end-to-end in this session.

**Dev mode:** In dev (`vite dev`), the `writeBundle` hook does NOT run — the public directory is served as-is with empty config strings. This is acceptable because `vapidKey` is also empty in dev (push is not configured), and the `usePushNotifications` hook returns `'unconfigured'` status when `vapidKey` is empty, so no FCM calls are attempted.

**VitePWA coexistence:** The existing `vite.config.ts` already has:
```
navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/]
```
This excludes the FCM SW from Workbox's navigation fallback, preventing the "constant reload" conflict with `generateSW`. [VERIFIED: vite.config.ts line 37 in repo]

**Plugin ordering:** Place `stampFirebaseSwPlugin()` AFTER `VitePWA` in the `plugins` array so that VitePWA writes its manifest before the stamp runs. [ASSUMED: A2]

---

## Common Pitfalls

### Pitfall 1: jsdom Has No `navigator.serviceWorker` or `Notification`

**What goes wrong:** Tests for `pushTokens.ts` call `navigator.serviceWorker.register()`. Tests for `usePushNotifications` read `Notification.permission`. jsdom provides neither by default.

**How to avoid:** In each test file, stub these on `globalThis` before running:

```typescript
// pushTokens.test.ts
const mockRegister = vi.fn().mockResolvedValue({ /* fake registration */ });
Object.defineProperty(globalThis, 'navigator', {
  value: { serviceWorker: { register: mockRegister } },
  writable: true,
});

// usePushNotifications.test.tsx
Object.defineProperty(globalThis, 'Notification', {
  value: { permission: 'default', requestPermission: vi.fn() },
  writable: true,
});
```

**Warning signs:** `TypeError: Cannot read property 'register' of undefined` or `ReferenceError: Notification is not defined`.

### Pitfall 2: React StrictMode Double-Mount Causes Two Subscriptions

**What goes wrong:** In development StrictMode, `useEffect` runs twice (mount → unmount → mount). If the `onForegroundMessage` promise hasn't resolved before the first unmount, the cancellation guard isn't in place and you get two subscriptions.

**How to avoid:** Use the `cancelled` flag pattern shown in Pattern 2. The flag is captured in the effect closure; both mounts share independent closure instances.

### Pitfall 3: `getToken` Fails with Cryptic Errors

**What goes wrong:** Common `getToken` rejections seen in production:
- `messaging/failed-service-worker-registration` — SW path is wrong or SW threw during init (most likely: empty config strings in SW)
- `messaging/token-subscribe-failed` — network error or VAPID key mismatch
- `messaging/permission-blocked` — permission is denied at the browser level but `Notification.permission` check was skipped

**How to avoid:** The `error` status branch in `usePushNotifications` must surface `e.message` as `errorMessage`. Never swallow FCM errors silently.

### Pitfall 4: Storing Token State Across Sessions

**What goes wrong:** After opt-out + page reload, the hook has no memory that the user opted out. On next mount it would show `idle` again.

**How to avoid:** Store the active token in `localStorage` keyed by `userId` on `enable()`, and clear it on `disable()`. On mount, read `localStorage` to restore `enabled` state. [ASSUMED: A3 — this localStorage strategy is not explicitly decided in CONTEXT.md; see Open Question 2.]

**Dependency:** The `'enabled'` state transition on mount in the state machine (Pattern 1) depends on this strategy being adopted. If A3 is rejected, the `'enabled'` state on mount transition is removed from the spec and the hook always starts `'idle'` when permission is `'granted'`.

### Pitfall 5: Empty Config Strings Crash the FCM SW

**What goes wrong:** `firebase.initializeApp({})` with empty strings fails silently in the SW context — the SW registers successfully but FCM background messages never arrive. There is no error in the main page console.

**How to avoid:** The `writeBundle` stamp plugin (see above) must run before deploy. Add a CI check or build-time assertion that the stamped SW does not contain `apiKey: ''`.

---

## Code Examples

### messaging.test.ts — Module Boundary Mock Pattern

Follow `todos.test.ts` exactly. Mock `firebase/messaging` and `./app` at module level; dynamic-import the module under test.

```typescript
// src/firebase/messaging.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const isSupported = vi.fn();
const getMessaging = vi.fn();
const getToken = vi.fn();
const onMessage = vi.fn();

vi.mock('firebase/messaging', () => ({
  isSupported: () => isSupported(),
  getMessaging: (...a: unknown[]) => getMessaging(...a),
  getToken: (...a: unknown[]) => getToken(...a),
  onMessage: (...a: unknown[]) => onMessage(...a),
}));

vi.mock('./app', () => ({
  getFirebaseApp: () => ({ __app: true }),
}));

vi.mock('./config', () => ({
  vapidKey: 'test-vapid-key',
}));

const importMessaging = async () => await import('./messaging');

describe('messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // reset module cache so _messaging singleton resets
  });

  it('getFcmToken returns null when FCM not supported', async () => {
    isSupported.mockResolvedValue(false);
    const { getFcmToken } = await importMessaging();
    const result = await getFcmToken({} as ServiceWorkerRegistration);
    expect(result).toBeNull();
  });

  it('getFcmToken calls getToken with vapidKey when supported', async () => {
    isSupported.mockResolvedValue(true);
    getMessaging.mockReturnValue({ __messaging: true });
    getToken.mockResolvedValue('tok-123');
    const { getFcmToken } = await importMessaging();
    const reg = {} as ServiceWorkerRegistration;
    const token = await getFcmToken(reg);
    expect(getToken).toHaveBeenCalledWith(
      { __messaging: true },
      { vapidKey: 'test-vapid-key', serviceWorkerRegistration: reg }
    );
    expect(token).toBe('tok-123');
  });

  it('onForegroundMessage returns noop when FCM not supported', async () => {
    isSupported.mockResolvedValue(false);
    const { onForegroundMessage } = await importMessaging();
    const unsub = await onForegroundMessage(vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('onForegroundMessage subscribes via onMessage and returns unsubscribe', async () => {
    isSupported.mockResolvedValue(true);
    getMessaging.mockReturnValue({ __messaging: true });
    const mockUnsub = vi.fn();
    onMessage.mockReturnValue(mockUnsub);
    const handler = vi.fn();
    const { onForegroundMessage } = await importMessaging();
    const unsub = await onForegroundMessage(handler);
    expect(onMessage).toHaveBeenCalledWith({ __messaging: true }, handler);
    expect(unsub).toBe(mockUnsub);
  });
});
```

### pushTokens.test.ts — Mock Pattern

```typescript
// src/firebase/pushTokens.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn();
const doc = vi.fn();
const setDoc = vi.fn();
const deleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => collection(...a),
  doc: (...a: unknown[]) => doc(...a),
  setDoc: (...a: unknown[]) => setDoc(...a),
  deleteDoc: (...a: unknown[]) => deleteDoc(...a),
}));

vi.mock('./app', () => ({
  getDb: () => ({ __db: true }),
}));

const getFcmToken = vi.fn();
vi.mock('./messaging', () => ({
  getFcmToken: (...a: unknown[]) => getFcmToken(...a),
}));

// jsdom has no serviceWorker — stub it
const mockRegister = vi.fn();
Object.defineProperty(globalThis.navigator, 'serviceWorker', {
  value: { register: mockRegister },
  writable: true,
  configurable: true,
});

const importPushTokens = async () => await import('./pushTokens');

describe('pushTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    collection.mockImplementation((_db: unknown, name: string) => ({ __col: name }));
    doc.mockImplementation((_db: unknown, col: string, id: string) => ({
      __doc: `${col}/${id}`,
    }));
  });

  it('registerCurrentDeviceForPush returns null when token is null', async () => {
    mockRegister.mockResolvedValue({});
    getFcmToken.mockResolvedValue(null);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    const result = await registerCurrentDeviceForPush('user-1');
    expect(result).toBeNull();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('registerCurrentDeviceForPush saves token to Firestore and returns it', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok-abc');
    setDoc.mockResolvedValue(undefined);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    const result = await registerCurrentDeviceForPush('user-1');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user-1', token: 'tok-abc' })
    );
    expect(result).toBe('tok-abc');
  });

  it('unregisterDeviceToken deletes the token doc', async () => {
    deleteDoc.mockResolvedValue(undefined);
    const { unregisterDeviceToken } = await importPushTokens();
    await unregisterDeviceToken('tok-abc');
    expect(deleteDoc).toHaveBeenCalled();
  });
});
```

### usePushNotifications.test.tsx — Hook Test Pattern

```typescript
// Notification must be stubbed on globalThis before the hook module loads
Object.defineProperty(globalThis, 'Notification', {
  value: { permission: 'default', requestPermission: vi.fn() },
  configurable: true,
  writable: true,
});

vi.mock('../firebase/pushTokens', () => ({
  registerCurrentDeviceForPush: (...a) => mockRegister(...a),
  unregisterDeviceToken: (...a) => mockUnregister(...a),
}));

vi.mock('../firebase/messaging', () => ({
  onForegroundMessage: (...a) => mockOnForegroundMessage(...a),
}));

vi.mock('../services/notificationService', () => ({
  requestNotificationPermission: (...a) => mockRequestPermission(...a),
}));

// Banner auto-dismiss test uses fake timers:
it('banner auto-dismisses after 5 seconds', async () => {
  vi.useFakeTimers();
  // ... set bannerMessage via onForegroundMessage callback ...
  act(() => { vi.advanceTimersByTime(5000); });
  expect(result.current.bannerMessage).toBeNull();
  vi.useRealTimers();
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Auto-request permission on auth | Explicit user action (button click) | Fewer permission prompt rejections |
| Single button to "enable push" | Toggle with live status | User sees whether push is active |
| firebase-messaging-sw.js with empty config | Build-time stamp via `writeBundle` plugin | SW actually works in deployed build |
| Banner state in component | Banner state in hook | Banner is testable via `renderHook` without component |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Importing `src/firebase/config.ts` from `vite.config.ts` works because Vite supports TS imports in config | SW Config Injection | Plugin fails at build; workaround: read values from `.env` or hardcode in vite.config.ts directly |
| A2 | `stampFirebaseSwPlugin` must come after `VitePWA` in plugins array | SW Config Injection | If ordering doesn't matter, plugin placement is irrelevant; no regression risk |
| A3 | localStorage is the right way to persist "user has a token on this device" across page reloads | Pattern 1, Pitfall 4 | If rejected: `'enabled'` on mount is removed from state machine; hook always starts `'idle'` when permission is `'granted'` — simpler but CONTEXT's "always show current push status" requirement may not be met |

---

## Open Questions

1. **Should `requestNotificationPermission` be removed from `LocalApp`?**
   - What we know: CONTEXT.md scope is "Firebase-mode app". `LocalApp` also calls `requestNotificationPermission()` on mount.
   - What's unclear: Whether the user wants this removed from `LocalApp` as well — the CONTEXT did not address it.
   - Recommendation: Do not touch `LocalApp` without explicit user instruction. Mark as out of scope for this phase.

2. **How should the hook surface "token exists on this device" after a page reload?**
   - What we know: The `'enabled'` status on mount requires knowing whether this device has a registered token. CONTEXT says "always show current push status".
   - What's unclear: Whether to persist the token in `localStorage` (simple, no Firestore read) or accept that the user will see `'idle'` after reload and must re-enable.
   - Dependency: This decision directly controls whether the `'enabled'` on-mount transition exists in the state machine (Pattern 1). It must be resolved before planning the mount initialisation task.
   - Recommendation: Use `localStorage` keyed by `userId`. Store on `enable()`, clear on `disable()`. This satisfies "always show current push status" at zero extra cost.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external tools or runtimes required. The Firebase project (todo-witek-6a21e) and all SDK dependencies are already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.0.5 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| R-01 | `getFcmToken` returns null when FCM unsupported | unit | `npm test -- messaging` | ❌ Wave 0 |
| R-02 | `getFcmToken` calls `getToken` with vapidKey | unit | `npm test -- messaging` | ❌ Wave 0 |
| R-03 | `onForegroundMessage` subscribes and returns unsubscribe | unit | `npm test -- messaging` | ❌ Wave 0 |
| R-04 | `registerCurrentDeviceForPush` saves token to Firestore | unit | `npm test -- pushTokens` | ❌ Wave 0 |
| R-05 | `unregisterDeviceToken` deletes token doc | unit | `npm test -- pushTokens` | ❌ Wave 0 |
| R-06 | Hook starts `unconfigured` when vapidKey is empty | unit | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-07 | Hook moves to `denied` when permission is denied | unit | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-08 | Hook moves to `enabled` after successful `enable()` | unit | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-09 | `disable()` calls `unregisterDeviceToken` and sets `disabled` | unit | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-10 | Banner auto-dismisses after 5 seconds | unit (fake timers) | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-11 | `onForegroundMessage` cleanup runs on unmount | unit | `npm test -- usePushNotifications` | ❌ Wave 0 |
| R-12 | Auto-permission-request removed from FirebaseApp | regression (code review) | `npm test && npm run typecheck` | ❌ Wave 0 — planner must create `src/App.test.tsx` with a test that mounts `FirebaseApp` and asserts `requestNotificationPermission` is NOT called automatically on user auth. This is a regression guard against the pattern being re-added. |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run typecheck && npm run build`
- **Phase gate:** All tests green + typecheck + build before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/firebase/messaging.test.ts` — covers R-01, R-02, R-03
- [ ] `src/firebase/pushTokens.test.ts` — covers R-04, R-05
- [ ] `src/hooks/usePushNotifications.test.tsx` — covers R-06 through R-11
- [ ] `src/components/PushToggle.test.tsx` — covers toggle render branches (status-driven)
- [ ] `src/App.test.tsx` — covers R-12 (regression: no auto-permission-request on auth)

*(Existing test infrastructure covers all other existing modules — no framework changes needed.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Firestore rules already enforce `request.auth.uid == resource.data.userId` for `fcmTokens` collection |
| V5 Input Validation | no | No user text input in this phase |
| V6 Cryptography | no | VAPID key is handled by Firebase SDK |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token registered under wrong userId | Tampering | `registerCurrentDeviceForPush` passes `userId` from auth; Firestore rules must enforce `request.auth.uid == request.resource.data.userId` |
| Token deletion by another user | Tampering | Firestore rules must restrict `delete` to the owning user |
| Push to unregistered device (stale token) | Denial of Service | Cloud Function (out of scope) handles token cleanup on FCM delivery failure |

**Note on Firestore rules:** Verify `firestore.rules` covers the `fcmTokens` collection. The existing rules cover `todos` — the planner must check whether `fcmTokens` is explicitly allowed or falls through to a deny-all default.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/firebase/messaging.ts`, `pushTokens.ts`, `config.ts`, `vite.config.ts` — verified by direct read
- Codebase: `src/firebase/todos.test.ts`, `auth.test.ts` — verified mock pattern
- Codebase: `src/hooks/useAuth.ts` — verified hook structure pattern

### Secondary (MEDIUM confidence)
- [Vite Plugin API — vite.dev](https://vite.dev/guide/api-plugin) — `writeBundle` hook confirmed post-build, not called in dev
- [vite-pwa/vite-plugin-pwa issue #777](https://github.com/vite-pwa/vite-plugin-pwa/issues/777) — confirmed static FCM SW + VitePWA denylist pattern (existing `vite.config.ts` already has this)

### Tertiary (LOW confidence — tagged ASSUMED)
- A1, A2, A3 as listed in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing
- Architecture: HIGH — hook and component patterns directly follow existing repo conventions
- Test patterns: HIGH — copied from `todos.test.ts` and `auth.test.ts`
- SW config injection: MEDIUM — `writeBundle` hook approach verified from docs; TS import from vite.config.ts is ASSUMED
- State machine: HIGH — derived from CONTEXT.md decisions and existing types

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable stack; Firebase SDK ^10.x, Vite 5.x)
