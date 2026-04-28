---
phase: 02
slug: firestore-api-github-actions-reminder-cron
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.0.5 (existing root install) |
| **Config file (React app)** | `vite.config.ts` (test section, environment: jsdom) |
| **Config file (scripts/)** | `scripts/vitest.config.ts` (Wave 0 gap — created in Plan 02 Task 1) |
| **Quick run command (app)** | `npm test -- --run` |
| **Quick run command (scripts)** | `npm run test:scripts` (requires Firestore emulator) |
| **Full suite command** | `npm test -- --run && npx firebase emulators:exec --only firestore "npm run test:scripts" --project todo-witek` |
| **Estimated runtime** | ~30s (app suite) + ~20s (scripts suite with emulator) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run` (app suite, no emulator needed)
- **After Plan 02 Task 2:** Run scripts suite with `npx firebase emulators:exec --only firestore "npm run test:scripts"`
- **After every plan wave:** Run full suite (both commands above)
- **Before verification:** Full suite must be green + `npm run typecheck` + `npm run build`
- **Max feedback latency:** ~50 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Decision | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | D-01/D-02 | T-01-01 | Error banner shows i18n string, not raw error | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | D-01/D-02 | T-01-01 | permission-denied branch switches banner | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | D-03/D-04/D-07 | — | package.json + firebase.json wired correctly | unit | `npm test -- --run` | ✅ | ⬜ pending |
| 02-02-02a | 02 | 1 | D-06 | T-02-04 | Reminder in window fires (10 min ago) | integration | `npm run test:scripts` | ❌ W0 | ⬜ pending |
| 02-02-02b | 02 | 1 | D-06 | T-02-04 | Reminder outside window skipped (45 min ago) | integration | `npm run test:scripts` | ❌ W0 | ⬜ pending |
| 02-02-02c | 02 | 1 | D-06 | — | Future reminder skipped (not yet due) | integration | `npm run test:scripts` | ❌ W0 | ⬜ pending |
| 02-02-02d | 02 | 1 | D-05 | T-02-05 | Stale token deleted on not-registered | integration | `npm run test:scripts` | ❌ W0 | ⬜ pending |
| 02-02-02e | 02 | 1 | D-08 | T-02-05 | fired=true written to Firestore after send | integration | `npm run test:scripts` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | D-03/D-06 | T-02-01/02/03 | Cron YAML has correct schedule and secret ref | manual | grep checks in plan | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/App.test.tsx` — add `Shell error banner` describe block with permission-denied and generic error tests (Plan 01 Task 1)
- [ ] `src/i18n.ts` — add `firestoreNotEnabled` key (Plan 01 Task 1)
- [ ] `scripts/vitest.config.ts` — create Vitest config for Node environment (Plan 02 Task 1)
- [ ] `scripts/send-reminders.cjs` — create stub (empty) to allow test imports to fail RED (Plan 02 Task 2)
- [ ] `scripts/send-reminders.test.cjs` — create integration test file with 5 tests (Plan 02 Task 2)
- [ ] `firebase.json` — add `emulators.firestore` block with port 8080 (Plan 02 Task 1)
- [ ] `package.json` — add `"test:scripts"` script and `firebase-admin` devDep (Plan 02 Task 1)

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Cron runs every 15 min in production | D-03 | Requires live GitHub Actions with `FIREBASE_SERVICE_ACCOUNT_KEY` secret set | 1. Set `FIREBASE_SERVICE_ACCOUNT_KEY` secret in repo settings. 2. Wait for next :00/:15/:30/:45 UTC mark. 3. Check Actions tab for `Send Due Reminders` workflow run. |
| Service account has minimum IAM roles | T-02-02 | IAM audit requires GCP Console access | Check GCP Console → IAM & Admin → IAM. Service account should only have `Cloud Datastore User` + `Firebase Cloud Messaging Admin`. No `Editor` or `Owner`. |
| Firestore API enabled at GCP level | Plan 01 goal | Requires GCP Console access | Navigate to console.firebase.google.com → Firestore Database. If API not enabled, the `permission-denied` banner should appear in the app. Enable the API and verify banner disappears. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
