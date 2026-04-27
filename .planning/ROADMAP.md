# Roadmap — Todo Witek

## Milestone 1: Core Feature Completion

### Phase 1: Push Notifications Setup

**Goal:** Full push notification support — FCM token registration, permission request UI, Firestore token storage, background/foreground message handling, and per-device opt-in/opt-out.

**Depends on:** —

**Plans:** 6 plans across 3 waves

Plans:
- [ ] 01-PLAN-01.md — Characterization tests for messaging.ts and pushTokens.ts
- [ ] 01-PLAN-02.md — Add getCurrentDeviceToken helper to pushTokens.ts (TDD)
- [ ] 01-PLAN-03.md — Vite writeBundle plugin to stamp firebase-messaging-sw.js with config
- [ ] 01-PLAN-04.md — usePushNotifications hook (TDD)
- [ ] 01-PLAN-05.md — PushToggle component (TDD)
- [x] 01-PLAN-06.md — Wire PushToggle into App.tsx, remove auto-permission, add foreground banner, regression test
