# Roadmap — Todo Witek

## Milestone 1: Core Feature Completion

### Phase 1: Push Notifications Setup

**Goal:** Full push notification support — FCM token registration, permission request UI, Firestore token storage, background/foreground message handling, and per-device opt-in/opt-out.

**Depends on:** —

**Plans:** 6 plans across 3 waves

Plans:
- [x] 01-PLAN-01.md — Characterization tests for messaging.ts and pushTokens.ts
- [x] 01-PLAN-02.md — Add getCurrentDeviceToken helper to pushTokens.ts (TDD)
- [x] 01-PLAN-03.md — Vite writeBundle plugin to stamp firebase-messaging-sw.js with config
- [x] 01-PLAN-04.md — usePushNotifications hook (TDD)
- [x] 01-PLAN-05.md — PushToggle component (TDD)
- [x] 01-PLAN-06.md — Wire PushToggle into App.tsx, remove auto-permission, add foreground banner, regression test

### Phase 2: Firestore API + GitHub Actions Reminder Cron

**Goal:** Make the app fully live — enable Firestore API at GCP level so data syncs, and wire up a GitHub Actions workflow (runs every 15 min) that queries Firestore for due reminders and sends FCM pushes via a Firebase service account.

**Depends on:** Phase 1

**Plans:** 2 plans in 1 wave (parallel)

Plans:
- [x] 02-PLAN-01.md — Firestore PERMISSION_DENIED error surface: distinct actionable banner in app when API not enabled
- [x] 02-PLAN-02.md — GitHub Actions cron workflow: Node script queries Firestore for due reminders, sends FCM via Admin SDK, marks fired; service account key stored as repo secret
