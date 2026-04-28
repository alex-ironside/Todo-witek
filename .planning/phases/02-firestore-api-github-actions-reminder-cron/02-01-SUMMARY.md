---
phase: 02-firestore-api-github-actions-reminder-cron
plan: 01
status: complete
completed: "2026-04-28"
---

# Plan 01 Summary — Firestore PERMISSION_DENIED Error Surface

## What was done

Added a distinct, actionable banner for Firestore `permission-denied` errors.

**Files changed:**
- `src/i18n.ts` — added `firestoreNotEnabled` key with Polish string pointing to console.firebase.google.com
- `src/App.tsx` — branched error banner render on `error.code === 'permission-denied'` using safe `as { code?: string }` cast
- `src/App.test.tsx` — refactored useTodos mock to use module-level `mockTodosState` variable; added two tests covering both error branches

## Verification

- `npm run typecheck` — ✅ passes
- `npm test -- --run` — ✅ 110 tests pass (2 new Shell error banner tests green)
- `npm run build` — ✅ passes

## Key decisions

- Cast `error as { code?: string }` — minimal safe cast; FirebaseError has `.code` at runtime but TypeScript's `Error` type doesn't declare it
- Generic `todosLoadError` path preserved for all errors where `.code !== 'permission-denied'`
