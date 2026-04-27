# Project State — Todo Witek

## Current Phase

Phase 1: Push Notifications Setup — In progress (plans 01, 03 complete, 4 remaining)

## Position

- Current plan: 01-04
- Last completed: 01-03 (Vite writeBundle plugin to stamp firebase-messaging-sw.js with config)
- Stopped at: None — continuing execution

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

### Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01    | 01   | 10min    | 2     | 2     |
| 01    | 03   | 8min     | 1     | 1     |

## Last Session

- Timestamp: 2026-04-27T20:53:00Z
- Stopped at: Completed 01-PLAN-03.md
- Resume file: None
