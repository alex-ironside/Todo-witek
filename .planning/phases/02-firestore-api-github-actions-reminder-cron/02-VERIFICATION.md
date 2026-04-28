---
phase: 02-firestore-api-github-actions-reminder-cron
status: passed
verified: "2026-04-28"
---

# Verification — Phase 2: Firestore API + GitHub Actions Reminder Cron

## Plan 01: Firestore PERMISSION_DENIED Error Surface

- [x] `grep 'firestoreNotEnabled' src/i18n.ts` — exits 0
- [x] `grep 'console\.firebase\.google\.com' src/i18n.ts` — exits 0
- [x] `grep 'permission-denied' src/App.tsx` — exits 0
- [x] `grep 't\.firestoreNotEnabled' src/App.tsx` — exits 0
- [x] `grep 'firestoreNotEnabled' src/App.test.tsx` — exits 0
- [x] `npm run typecheck` — ✅ passes
- [x] `npm test -- --run` — ✅ 110 tests pass (2 new Shell error banner tests green)
- [x] `npm run build` — ✅ passes

## Plan 02: GitHub Actions Cron Workflow

- [x] `grep '"firebase-admin"' package.json` — exits 0
- [x] `grep '"test:scripts"' package.json` — exits 0
- [x] `grep '"emulators"' firebase.json` — exits 0
- [x] `scripts/vitest.config.ts` contains `environment: 'node'`
- [x] `scripts/send-reminders.cjs` contains `module.exports = { sendDueReminders }`
- [x] `scripts/send-reminders.cjs` contains `WINDOW_MS = 30 * 60 * 1000`
- [x] `scripts/send-reminders.cjs` contains `registration-token-not-registered`
- [x] `scripts/send-reminders.test.cjs` contains `registration-token-not-registered`
- [x] `.github/workflows/send-reminders.yml` contains `*/15 * * * *`
- [x] `.github/workflows/send-reminders.yml` contains `node scripts/send-reminders.cjs`
- [x] `.github/workflows/send-reminders.yml` contains `FIREBASE_SERVICE_ACCOUNT_KEY`
- [x] `npx firebase emulators:exec --only firestore "npm run test:scripts"` — ✅ 5/5 tests pass
- [x] `npm run typecheck` — ✅ passes
- [x] `npm test -- --run` — ✅ 110 tests pass (root suite unaffected)
- [x] `npm run build` — ✅ passes

## Human Verification Required

- [ ] Set `FIREBASE_SERVICE_ACCOUNT_KEY` GitHub secret (service account JSON from Firebase Console)
- [ ] Restrict service account IAM to: Cloud Datastore User + Firebase Cloud Messaging Admin only
- [ ] Trigger `workflow_dispatch` manually from GitHub UI to verify the cron script runs without error in CI
