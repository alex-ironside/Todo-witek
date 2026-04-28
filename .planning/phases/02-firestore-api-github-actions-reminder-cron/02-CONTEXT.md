# Phase 2: Firestore API + GitHub Actions Reminder Cron - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Two jobs:
1. Surface Firestore `PERMISSION_DENIED` errors explicitly in the UI so the app fails visibly instead of hanging forever when the Firestore API isn't enabled yet.
2. A GitHub Actions cron workflow (every 15 min) with a standalone Node.js script that queries Firestore for due reminders, sends FCM pushes via the Admin SDK, marks them fired, and cleans up stale tokens. Service account key stored as a GitHub repo secret.

</domain>

<decisions>
## Implementation Decisions

### Firestore Error Surface (Plan 01)
- **D-01:** Detect `error.code === 'permission-denied'` specifically and show a distinct, actionable message: *"Firestore not enabled — enable it at console.firebase.google.com"*
- **D-02:** The generic `todosLoadError` banner stays for other errors. Only `PERMISSION_DENIED` gets its own message. Detection happens where `onError` is currently received (the hook or repo layer — implementer's discretion on exact seam).

### Cron Script Location (Plan 02)
- **D-03:** New top-level `scripts/` directory. Clean separation from `functions/` (which is for Firebase Cloud Functions). The GitHub Actions workflow references `scripts/send-reminders.js` directly.
- **D-04:** Script language: plain JavaScript (CommonJS), matching the existing `functions/index.js` pattern. No TypeScript compilation step in the cron workflow.

### Stale FCM Token Cleanup
- **D-05:** When `sendEachForMulticast` returns `registration-token-not-registered` for a token, delete that token document from the `fcmTokens` Firestore collection. Prevents dead token accumulation across device reinstalls and browser data clears.

### Look-back Window
- **D-06:** Fire only reminders where `remindAt` is between `(now - 30 minutes)` and `now`. Reminders older than 30 min are silently skipped — prevents a flood of stale notifications after a cron outage. The window (30 min) covers 2 cron cycles as a buffer.

### Testing Strategy
- **D-07:** Integration tests against the Firebase emulator (Firestore + FCM emulator). Test runner: Vitest (same as the app) with a `vitest.config.ts` inside `scripts/` targeting the Node environment.
- **D-08:** Tests cover: due reminder detection (in-window vs. out-of-window), FCM dispatch, mark-fired update, and stale token deletion on `registration-token-not-registered`.

### Claude's Discretion
- Exact seam for PERMISSION_DENIED detection (hook vs. repo vs. observeUserTodos wrapper)
- How to run emulator in CI for the scripts/ tests (whether to reuse the existing emulator config or add a separate one)
- Whether scripts/ gets its own `package.json` or reuses the root one

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing logic to adapt
- `functions/index.js` — Cloud Functions stub with the reminder-sending algorithm (query pattern, FCM multicast, mark-fired logic, token structure). Adapt this for the standalone script.
- `src/firebase/pushTokens.ts` — Shows the `fcmTokens` Firestore collection schema (`userId`, `token` fields).

### Existing error propagation
- `src/firebase/todos.ts` — `observeUserTodos` already calls `onError(err)` on snapshot errors. The `err.code` contains the Firebase error code (e.g., `'permission-denied'`).
- `src/hooks/useTodos.ts` — Where `onError` propagates from `observeUserTodos` to component state.
- `src/App.tsx` — Where `{error && <div className="banner warn">...</div>}` renders. Current message is `t.todosLoadError`.

### Type definitions
- `src/types.ts` — `Reminder` (`id`, `remindAt: number`, `fired: boolean`), `Todo` (`ownerId`, `done`, `reminders`).

### GitHub Actions CI pattern
- `.github/workflows/deploy.yml` — Existing workflow structure (Node 20, npm ci pattern) to follow for the new cron workflow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `functions/index.js` — The reminder-sending algorithm already written (adapt, don't reinvent)
- `observeUserTodos` `onError` callback — already plumbed to the UI; just need to branch on `error.code`

### Established Patterns
- Firebase wrappers in `src/firebase/` are the only place that imports `firebase/*` (client SDK). The cron script uses `firebase-admin` — different SDK, different context, lives in `scripts/`.
- Error display: `banner warn` CSS class; `t.todosLoadError` i18n key pattern. The new PERMISSION_DENIED message follows the same visual pattern but with a different string.
- Tests co-located with source: `scripts/send-reminders.test.js` next to `scripts/send-reminders.js`.

### Integration Points
- `fcmTokens` Firestore collection — where tokens are stored; cron reads and cleans from here
- `todos` Firestore collection — where reminders live; cron reads and writes `reminders` array
- GitHub Actions secrets — `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON) for Admin SDK auth

</code_context>

<specifics>
## Specific Ideas

- The 30-min look-back window is intentional: if the cron is ever down, old reminders are silently dropped rather than flooding the user on recovery. Accept this trade-off.
- `functions/index.js` does NOT have a look-back window — the standalone `scripts/` version adds this as a deliberate improvement.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-firestore-api-github-actions-reminder-cron*
*Context gathered: 2026-04-28*
