---
phase: 02-firestore-api-github-actions-reminder-cron
plan: 02
status: complete
completed: "2026-04-28"
---

# Plan 02 Summary — GitHub Actions Cron + Reminder Script

## What was done

Created the full cron infrastructure for cross-device push reminder delivery.

**Files created/modified:**
- `scripts/send-reminders.cjs` — CommonJS Admin SDK script; 30-min look-back window (D-06), stale token cleanup (D-05), mark-fired (D-08); accepts `messagingOverride` for testability
- `scripts/send-reminders.test.cjs` — 5 integration tests covering all D-05/D-06/D-08 behaviours against Firestore emulator
- `scripts/vitest.config.ts` — Vitest config for Node environment targeting scripts/
- `.github/workflows/send-reminders.yml` — cron `*/15 * * * *`, `workflow_dispatch`, Node 20, `FIREBASE_SERVICE_ACCOUNT_KEY` secret
- `package.json` — added `firebase-admin ^12.4.0` devDep + `test:scripts` npm script
- `firebase.json` — added `emulators` block (port 8080, UI disabled)
- `vite.config.ts` — added `exclude: ['scripts/**']` to root test config

## Verification

- `npx firebase emulators:exec --only firestore "npm run test:scripts"` — ✅ 5/5 integration tests pass
- `npm run typecheck` — ✅ passes
- `npm test -- --run` — ✅ 110 tests pass (root suite unaffected)
- `npm run build` — ✅ passes

## Key decisions

- Used `.cjs` extension for CommonJS compatibility with root `"type": "module"` (D-04)
- `vi.mock()` cannot be used in `.cjs` Vitest files (Vitest is ESM-only; hoisting fails before globals init) → used dependency injection: `sendDueReminders(messagingOverride)` instead
- Firestore Admin SDK query returns tokens alphabetically — Test D mock responses ordered to match `good-token` (idx 0) → success, `stale-token` (idx 1) → failure
- `scripts/` excluded from root Vitest config to prevent emulator-dependent tests from running in the main React test suite

## User setup required

Before the first cron fires:
1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key (download JSON)
2. GCP Console → IAM → restrict service account to: Cloud Datastore User + Firebase Cloud Messaging Admin only
3. GitHub repo → Settings → Secrets → Actions → New secret: `FIREBASE_SERVICE_ACCOUNT_KEY` = paste full JSON
