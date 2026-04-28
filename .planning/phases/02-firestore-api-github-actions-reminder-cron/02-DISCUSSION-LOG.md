# Phase 2: Firestore API + GitHub Actions Reminder Cron - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-firestore-api-github-actions-reminder-cron
**Areas discussed:** Firestore error message, Cron script location, Stale FCM token cleanup, Old reminder look-back window, Cron script testing

---

## Firestore Error Message

| Option | Description | Selected |
|--------|-------------|----------|
| Specific actionable message | Detect permission-denied code, show "Firestore not enabled — enable it at console.firebase.google.com" | ✓ |
| Generic + error code | Show existing banner but append error code | |
| Generic only | Keep existing 'Could not load todos' banner as-is | |

**User's choice:** Specific actionable message
**Notes:** Helps diagnose setup issues instantly since this is a personal app.

---

## Cron Script Location

| Option | Description | Selected |
|--------|-------------|----------|
| scripts/ directory | New top-level scripts/send-reminders.js; clean separation from functions/ | ✓ |
| Adapt functions/index.js | Rework existing stub with a main() entry point | |
| Inline in workflow YAML | Embed Node.js logic directly in GitHub Actions YAML | |

**User's choice:** scripts/ directory
**Notes:** Keep functions/ for Cloud Functions, scripts/ for CI/automation.

---

## Stale FCM Token Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Delete invalid tokens from Firestore | Remove token doc when FCM returns registration-token-not-registered | ✓ |
| Log and continue | Leave Firestore doc in place, just log the error | |
| You decide | Claude picks cleanup approach | |

**User's choice:** Delete invalid tokens from Firestore
**Notes:** Prevents accumulation of dead tokens over time.

---

## Old Reminder Look-back Window

| Option | Description | Selected |
|--------|-------------|----------|
| All unfired reminders (no window) | Fire any reminder where remindAt <= now, regardless of age | |
| 30-minute window | Only fire reminders from the last 30 min; skip older ones | ✓ |
| You decide | Claude picks a sensible window | |

**User's choice:** 30-minute window
**Notes:** Prevents flood of stale notifications after cron outage. Covers 2 cron cycles as buffer.

---

## Cron Script Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Mock firebase-admin at module boundary | Unit tests with mocked Admin SDK | |
| Integration test against Firebase emulator | Real Firestore + FCM emulators in tests | ✓ |
| No tests | Skip tests, verify manually | |

**User's choice:** Integration tests against Firebase emulator
**Notes:** More realistic coverage. Test runner: Vitest (same as app).

### Test runner follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest (same as app) | vitest.config.ts in scripts/, Node environment | ✓ |
| Jest | Separate Jest setup in scripts/ | |
| You decide | Claude picks based on least friction | |

**User's choice:** Vitest
**Notes:** Consistent tooling across the repo.

---

## Claude's Discretion

- Exact seam for PERMISSION_DENIED detection
- Emulator setup for scripts/ tests in CI
- Whether scripts/ gets its own package.json

## Deferred Ideas

None.
