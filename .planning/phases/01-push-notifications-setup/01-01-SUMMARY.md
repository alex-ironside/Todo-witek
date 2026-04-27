---
phase: 01-push-notifications-setup
plan: "01"
subsystem: testing
tags: [vitest, firebase, fcm, messaging, push-tokens]

# Dependency graph
requires: []
provides:
  - Characterization test suite for messaging.ts (getFcmToken, onForegroundMessage)
  - Characterization test suite for pushTokens.ts (registerCurrentDeviceForPush, unregisterDeviceToken)
  - Mock boundary pattern for firebase/messaging established for future hook tests
affects:
  - 01-push-notifications-setup (plans 02+: hook and integration tests depend on these mock patterns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.resetModules() in beforeEach for modules with module-level singletons"
    - "vi.mock() firebase SDK at module boundary with (...a: unknown[]) => fn(...a) passthrough"
    - "Object.defineProperty on globalThis.navigator for jsdom serviceWorker stub"
    - "Dynamic import pattern: const importX = async () => await import('./x')"

key-files:
  created:
    - src/firebase/messaging.test.ts
    - src/firebase/pushTokens.test.ts
  modified: []

key-decisions:
  - "vi.resetModules() required in beforeEach to reset _messaging singleton between tests"
  - "navigator.serviceWorker stubbed via Object.defineProperty with configurable:true before module loads"
  - "config mock provides vapidKey='test-vapid-key' to avoid the !vapidKey null guard in getFcmToken"

patterns-established:
  - "Module singleton reset: use vi.resetModules() + dynamic import in every test that touches a module with module-level state"
  - "jsdom serviceWorker stub: Object.defineProperty on globalThis.navigator before importX call"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-04-27
---

# Phase 1 Plan 01: Characterization tests for messaging.ts and pushTokens.ts

**Vitest characterization tests covering FCM token retrieval, foreground message subscription, Firestore push-token registration, and token deletion — all four mock boundary patterns needed by Wave 2 hook tests.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-27T20:45:00Z
- **Completed:** 2026-04-27T20:46:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 4 green tests for messaging.ts covering both supported and unsupported FCM paths
- 3 green tests for pushTokens.ts covering null token guard, Firestore write shape, and deletion
- All 80 existing tests continue to pass; typecheck and build pass clean

## Task Commits

1. **Task 1: Write messaging.test.ts** - `2bafd19` (test)
2. **Task 2: Write pushTokens.test.ts** - `c2a8fd8` (test)

## Files Created/Modified
- `src/firebase/messaging.test.ts` - 4 characterization tests for getFcmToken and onForegroundMessage
- `src/firebase/pushTokens.test.ts` - 3 characterization tests for registerCurrentDeviceForPush and unregisterDeviceToken

## Decisions Made
- Used `vi.resetModules()` in `beforeEach` (not `afterEach`) to ensure the module singleton `_messaging` is reset before each test loads a fresh module instance.
- Stubbed `navigator.serviceWorker` at module scope (before any import) because jsdom does not provide this property; `configurable: true` allows later overrides if needed.
- Mocked `./config` to export `vapidKey: 'test-vapid-key'` — without this the `!vapidKey` guard in `getFcmToken` would return null even when FCM is supported.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Mock boundaries for `messaging` and `pushTokens` are established; Wave 2 can mock `./messaging` and `./pushTokens` at module boundary when testing the `usePushNotifications` hook.
- Both wrappers verified to behave as documented.

---
*Phase: 01-push-notifications-setup*
*Completed: 2026-04-27*
