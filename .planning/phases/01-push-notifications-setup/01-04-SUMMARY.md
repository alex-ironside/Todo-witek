---
phase: "01"
plan: "04"
subsystem: hooks/usePushNotifications
tags: [push-notifications, fcm, react-hook, tdd]
dependency_graph:
  requires: [01-PLAN-01, 01-PLAN-02]
  provides: [usePushNotifications, PushStatus, PushState]
  affects:
    - src/hooks/usePushNotifications.ts
    - src/hooks/usePushNotifications.test.tsx
tech_stack:
  added: []
  patterns: [TDD red-green, state machine hook, cancellation guard, fake timers]
key_files:
  created:
    - src/hooks/usePushNotifications.ts
    - src/hooks/usePushNotifications.test.tsx
decisions:
  - "Firestore-based on-mount status check via getCurrentDeviceToken — not localStorage"
  - "Cancellation guard pattern for onForegroundMessage async unsubscribe (StrictMode-safe)"
  - "5-second auto-dismiss timer owned by hook, not component"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-27"
---

# Phase 1 Plan 04: usePushNotifications hook (TDD) Summary

**One-liner:** usePushNotifications hook with 9-state PushStatus machine, Firestore-based on-mount token check, cancellation-guarded foreground message subscription, and 5-second auto-dismiss banner timer.

## What Was Built

Created `src/hooks/usePushNotifications.ts` exporting:

- `PushStatus` — union of 9 status strings: `unsupported`, `unconfigured`, `idle`, `requesting`, `denied`, `registering`, `enabled`, `disabled`, `error`
- `PushState` — interface with status, token, errorMessage, bannerMessage, dismissBanner, enable, disable
- `usePushNotifications(userId: string): PushState` — the hook

Hook behaviour:

1. **Mount effect:** checks vapidKey, Notification API, Notification.permission, then calls `getCurrentDeviceToken(userId)` to determine initial status
2. **Foreground subscription:** `onForegroundMessage` with cancellation guard — if component unmounts before the returned Promise resolves, the unsub is called immediately in the `.then` branch
3. **Auto-dismiss:** `setTimeout(..., 5000)` keyed on `bannerMessage` state, cleared on re-render
4. **enable():** `requesting → denied` | `requesting → registering → enabled` | `requesting → registering → error`
5. **disable():** calls `unregisterDeviceToken(token)` then transitions to `disabled`

Created `src/hooks/usePushNotifications.test.tsx` with 12 tests covering all mount transitions, all action paths, banner lifecycle, and cancellation flag cleanup.

## TDD Gate Compliance

- RED commit `63db32b`: `test(01-04): add 12 failing tests for usePushNotifications hook (RED)` — 12 tests failing (module not found)
- GREEN commit `acabf1f`: `feat(01-04): implement usePushNotifications hook (GREEN)` — all 12 tests passing

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/hooks/usePushNotifications.ts` exists with all required exports
- `src/hooks/usePushNotifications.test.tsx` exists with 12 tests
- All 12 tests pass (`npm test -- usePushNotifications`)
- `npm run typecheck` exits 0
- RED commit `63db32b` and GREEN commit `acabf1f` present in git log
