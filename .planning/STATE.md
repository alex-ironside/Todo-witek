---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Complete
last_updated: "2026-04-28T12:28:00.000Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
---

# Project State — Todo Witek

## Current Phase

Phase 2: Firestore API + GitHub Actions Reminder Cron — COMPLETE (all 2 plans done)

## Position

- Current plan: Complete
- Last completed: 02-02 (GitHub Actions cron workflow)
- Stopped at: None — milestone complete

## Accumulated Context

### Roadmap Evolution

- Phase 1 added: add full push notifications setup
- Phase 2 added: Firestore API enablement + GitHub Actions reminder cron (every 15 min)

### Decisions

- vi.resetModules() required in beforeEach to reset _messaging singleton between tests
- navigator.serviceWorker stubbed via Object.defineProperty with configurable:true before module loads
- config mock provides vapidKey='test-vapid-key' to avoid the !vapidKey null guard in getFcmToken
- Import firebaseConfig directly in vite.config.ts for build-time SW stamping (single source of truth)
- Vite writeBundle plugin placed after VitePWA so public/ assets are already copied before stamping
- public/firebase-messaging-sw.js kept as clean template; dist/ copy stamped at build time
- LocalApp requestNotificationPermission call intentionally preserved (local mode auto-permission is accepted behavior)
- vapidKey removed from App.tsx imports — no longer referenced after replacing old JSX guard with PushToggle
- pushBanner rendered before offline/error banners so foreground FCM messages appear at top of banner region

### Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | 10min    | 2     | 2     |
| 01    | 03   | 8min     | 1     | 1     |
| 01    | 06   | ~2min    | 2     | 2     |

- Cast `error as { code?: string }` in App.tsx for FirebaseError.code — minimal safe cast, avoids `any`
- vi.mock() unusable in .cjs Vitest test files (ESM-only module; hoisting runs before globals init) → dependency injection: sendDueReminders(messagingOverride) instead
- Firestore Admin SDK query returns tokens alphabetically in emulator — Test D mock responses ordered to match actual index positions
- scripts/ excluded from root vite.config.ts test config (emulator-dependent tests must not run in main React suite)

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-28:

| Category | Item | Status |
|----------|------|--------|
| debug | data-is-not-synched | root_cause_found — Firestore API now enabled (permission-denied → security rules, not API disabled). Debug session resolved. |
| verification | Phase 01 human_needed | Live FCM opt-in/out/banner tests require real browser + VAPID key |
| setup | FIREBASE_SERVICE_ACCOUNT_KEY | GitHub secret not yet set — user must configure before cron fires |

## Last Session

- Timestamp: 2026-04-28T12:28:00Z
- Stopped at: Completed 02-PLAN-02.md (milestone complete)
- Resume file: None
