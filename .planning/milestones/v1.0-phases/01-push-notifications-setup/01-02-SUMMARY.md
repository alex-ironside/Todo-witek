---
phase: "01"
plan: "02"
subsystem: firebase/pushTokens
tags: [push-notifications, fcm, firestore, tdd]
dependency_graph:
  requires: [01-PLAN-01]
  provides: [getCurrentDeviceToken]
  affects: [src/firebase/pushTokens.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, firebase/firestore getDoc, SW registration]
key_files:
  modified:
    - src/firebase/pushTokens.ts
    - src/firebase/pushTokens.test.ts
decisions:
  - "getCurrentDeviceToken does SW register + getFcmToken + Firestore getDoc ownership check — no new abstractions"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-27"
---

# Phase 1 Plan 02: Add getCurrentDeviceToken helper to pushTokens.ts Summary

**One-liner:** getCurrentDeviceToken wraps SW registration, getFcmToken, and Firestore getDoc ownership check into a single helper for the usePushNotifications hook mount check.

## What Was Built

Added `getCurrentDeviceToken(userId: string): Promise<string | null>` to `src/firebase/pushTokens.ts`. The function:

1. Returns null if `serviceWorker` is absent from navigator
2. Registers the FCM SW (same URL/scope as `registerCurrentDeviceForPush`)
3. Calls `getFcmToken(registration)` — returns null if no token
4. Calls `getDoc` on the `fcmTokens/{token}` document
5. Returns the token only if the doc exists and `doc.data().userId === userId`; otherwise null

## TDD Gate Compliance

- RED commit `21488df`: `test(01-02): add failing tests for getCurrentDeviceToken` — 2 tests failing, 3 passing
- GREEN commit `9b3c02b`: `feat(01-02): implement getCurrentDeviceToken helper` — all 5 tests passing

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/firebase/pushTokens.ts` exists with `export const getCurrentDeviceToken`
- `src/firebase/pushTokens.test.ts` contains both new tests
- All 5 pushTokens tests pass
- `npm run typecheck` exits 0
- RED commit `21488df` and GREEN commit `9b3c02b` both present in git log
