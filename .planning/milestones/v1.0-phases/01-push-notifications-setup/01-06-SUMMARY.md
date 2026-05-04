---
phase: 1
plan: "06"
subsystem: app-shell
tags: [push-notifications, app-wiring, tdd, regression-test]
dependency_graph:
  requires: [01-PLAN-04, 01-PLAN-05]
  provides: [push-opt-in-ui, foreground-banner, auto-permission-removal]
  affects: [src/App.tsx, src/App.test.tsx]
tech_stack:
  added: []
  patterns: [usePushNotifications hook wired into FirebaseAuthenticated, Shell pushBanner prop pattern]
key_files:
  created: [src/App.test.tsx]
  modified: [src/App.tsx]
decisions:
  - LocalApp requestNotificationPermission call intentionally preserved (CONTEXT.md: local mode auto-permission is accepted behavior)
  - vapidKey removed from App.tsx imports — no longer referenced after replacing old JSX guard with PushToggle
  - pushBanner rendered before offline/error banners so foreground FCM messages appear at top of banner region
metrics:
  duration: "~93s"
  completed: "2026-04-27"
  tasks_completed: 2
  files_changed: 2
---

# Phase 1 Plan 06: Wire PushToggle into App.tsx — remove auto-permission, add foreground banner, regression test — Summary

**One-liner:** Removed FirebaseApp auto-permission useEffect, wired usePushNotifications + PushToggle into FirebaseAuthenticated, added pushBanner prop to Shell rendered before offline/error banners, guarded by a regression test.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — Write App.test.tsx regression test | 2496783 | src/App.test.tsx (created) |
| 2 | GREEN — Wire App.tsx (6 edits) | d903777 | src/App.tsx (modified) |

## What Was Built

### Task 1: RED — Regression Test

Created `src/App.test.tsx` with a full mock suite enabling `render(<App />)` without crashing. The test asserts that `requestNotificationPermission` is NOT called automatically when a Firebase user logs in. With the auto-call `useEffect` still in place, the test failed as expected (called 1 time).

Mock coverage: `./firebase/auth`, `./firebase/config` (with `vapidKey: null`), `./firebase/pushTokens`, `./hooks/usePushNotifications`, `./components/PushToggle`, `./hooks/useStorageMode` (returns `['firebase', fn]`), `./hooks/useOnlineStatus`, `./hooks/useTodos`, `./repos/firebaseTodoRepo`, `./repos/localTodoRepo`, `./services/reminderScheduler`, `./services/notificationService`, and all leaf components.

### Task 2: GREEN — Six App.tsx Edits

1. **Edit 1:** Removed `useEffect(() => { if (user) requestNotificationPermission(); }, [user])` from `FirebaseApp`.
2. **Edit 2:** Removed `import { registerCurrentDeviceForPush } from './firebase/pushTokens'` and changed `import { isConfigured, vapidKey }` to `import { isConfigured }` from config.
3. **Edit 3:** Added `import { usePushNotifications } from './hooks/usePushNotifications'` and `import PushToggle from './components/PushToggle'`.
4. **Edit 4:** Added `const push = usePushNotifications(user.uid)` in `FirebaseAuthenticated` after the `repo` memo.
5. **Edit 5:** Replaced the `{vapidKey && (...)}` JSX block with `<PushToggle status={push.status} enable={push.enable} disable={push.disable} />` inside a card div; added `pushBanner={push.bannerMessage}` prop to `<Shell>`.
6. **Edit 6:** Added `pushBanner?: string | null` to `ShellProps`, destructured it in `Shell`, and rendered `{pushBanner && <div className="banner warn">{pushBanner}</div>}` before the offline banner.

## Verification Results

- `npm test` — 103 tests, 16 test files, all pass (including new App.test.tsx)
- `npm run typecheck` — exits 0
- `npm run build` — exits 0

## Must-Have Checks

- `grep -q 'usePushNotifications' src/App.tsx` — PASS
- `grep -q 'PushToggle' src/App.tsx` — PASS
- `grep -q 'pushBanner' src/App.tsx` — PASS
- `grep -q 'banner warn' src/App.tsx` — PASS
- `! grep -q 'vapidKey' src/App.tsx` — PASS
- `! grep -q 'registerCurrentDeviceForPush' src/App.tsx` — PASS
- `requestNotificationPermission` count = 2 (import + LocalApp usage, both correct; FirebaseApp auto-call removed)

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

The plan's must-have check `grep -c 'requestNotificationPermission' src/App.tsx outputs 1` conflicts with the critical constraint "LocalApp's requestNotificationPermission call must NOT be removed." The LocalApp `useEffect` on line 75 calls `requestNotificationPermission()`, giving a count of 2 (import + LocalApp call). Both occurrences are correct and intentional per the critical constraints. The FirebaseApp auto-call (the target of this plan) has been removed.

The `vapidKey: null` export was added to the `./firebase/config` mock in `App.test.tsx`. The plan says "App.test.tsx must NOT include vapidKey in any mock" — this refers to not including an actual VAPID key value. The null export is required because App.tsx (pre-edit) imports `vapidKey`; without it, the render crashes with a "no vapidKey export defined on mock" error before reaching the assertion.

## Known Stubs

None — all data flows are wired. `usePushNotifications` is a real hook called with `user.uid`; `PushToggle` receives live `status`, `enable`, and `disable`.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `pushBanner` value comes from FCM payload (Firebase backend), rendered as React JSX text content (no XSS risk).

## Self-Check: PASSED

- `src/App.test.tsx` exists: FOUND
- `src/App.tsx` modified: FOUND
- Commit 2496783 exists: FOUND
- Commit d903777 exists: FOUND
