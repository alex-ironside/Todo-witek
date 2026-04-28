# Milestones — Todo Witek

## v1.0 — Core Feature Completion

**Shipped:** 2026-04-28
**Phases:** 2 | **Plans:** 8 | **Tests:** 115 (110 unit + 5 integration)

### Delivered

Full push notification support and cross-device reminder delivery via GitHub Actions cron — the app now works end-to-end with real Firebase.

### Key Accomplishments

1. FCM token registration, permission UI (PushToggle), Firestore token storage — 9 tests
2. usePushNotifications state machine: unconfigured → enabled/disabled — 12 tests
3. Vite writeBundle plugin stamps firebase-messaging-sw.js with real config at build time
4. Foreground FCM banner rendered before offline/error banners in Shell
5. Firestore `permission-denied` surfaces as actionable banner pointing to console.firebase.google.com
6. GitHub Actions cron (`*/15 * * * *`) sends FCM for due reminders; 30-min look-back window, stale token cleanup, mark-fired write-back — 5 integration tests against Firestore emulator

### Known Deferred Items at Close: 2

See STATE.md Deferred Items — live FCM device tests (require real browser) and FIREBASE_SERVICE_ACCOUNT_KEY GitHub secret setup (user action required).
