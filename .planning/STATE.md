# Project State — Todo Witek

## Current Phase

Phase 1: Push Notifications Setup — COMPLETE (all 6 plans done)

## Position

- Current plan: Complete
- Last completed: 01-06 (Wire PushToggle into App.tsx, remove auto-permission, add foreground banner, regression test)
- Stopped at: None — phase complete

## Accumulated Context

### Roadmap Evolution

- Phase 1 added: add full push notifications setup

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

## Last Session

- Timestamp: 2026-04-27T20:58:00Z
- Stopped at: Completed 01-PLAN-06.md (phase complete)
- Resume file: None
