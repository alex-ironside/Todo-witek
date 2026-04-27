---
phase: 01-push-notifications-setup
plan: "03"
subsystem: infra
tags: [vite, firebase, fcm, service-worker, build-plugin]

requires: []
provides:
  - "stampFirebaseSwPlugin Vite inline plugin that stamps real Firebase config into dist/firebase-messaging-sw.js at build time"
  - "public/firebase-messaging-sw.js remains as clean template with empty placeholders"
affects: [01-push-notifications-setup]

tech-stack:
  added: []
  patterns:
    - "Vite writeBundle hook for post-copy dist file patching"
    - "Build-time config injection: import src config module directly in vite.config.ts"

key-files:
  created: []
  modified:
    - vite.config.ts

key-decisions:
  - "Import firebaseConfig directly into vite.config.ts to avoid runtime config duplication"
  - "Plugin stamps dist/ copy only — public/ template remains unchanged with empty strings"
  - "Plugin placed after VitePWA so it runs after PWA plugin copies public/ assets"

patterns-established:
  - "Build-time injection: add inline Vite plugin after VitePWA using writeBundle hook to patch copied assets"

requirements-completed: []

duration: 8min
completed: 2026-04-27
---

# Phase 1 Plan 03: Vite writeBundle plugin to stamp firebase-messaging-sw.js with config — Summary

**Inline Vite writeBundle plugin stamps six real Firebase config values into dist/firebase-messaging-sw.js at build time, leaving the public/ template unchanged with empty placeholder strings**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-27T20:45:00Z
- **Completed:** 2026-04-27T20:53:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `stampFirebaseSwPlugin` inline function in vite.config.ts with a `writeBundle` hook
- Plugin replaces all six empty config placeholders (`apiKey: ''`, `authDomain: ''`, `projectId: ''`, `storageBucket: ''`, `messagingSenderId: ''`, `appId: ''`) with real values from `firebaseConfig`
- `dist/firebase-messaging-sw.js` now contains `apiKey: 'AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q'` after build
- `public/firebase-messaging-sw.js` template remains untouched (empty strings preserved)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stampFirebaseSwPlugin to vite.config.ts** - `67fbf0a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `vite.config.ts` - Added Node.js fs/path imports, firebaseConfig import, stampFirebaseSwPlugin function, and plugin registration after VitePWA

## Decisions Made
- Import firebaseConfig directly in vite.config.ts — avoids any runtime config mismatch, single source of truth
- Plugin positioned after VitePWA in plugins array — ensures VitePWA has already copied public/ assets before the stamp runs
- Plugin only runs during `vite build` (writeBundle hook), not during `vite dev` — correct behavior since dev serves public/ as-is with empty strings (vapidKey is also empty)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Build-time stamping is complete; FCM SW will receive real config values on every production build
- Remaining push notification work in phase 01 can proceed (vapidKey still empty; that will be set when FCM is fully configured)

## Self-Check: PASSED

- stampFirebaseSwPlugin present in vite.config.ts: FOUND
- writeBundle hook present: FOUND
- stamp-firebase-sw plugin name present: FOUND
- fs import present: FOUND
- firebaseConfig import present: FOUND
- dist/firebase-messaging-sw.js has real apiKey: FOUND
- dist/firebase-messaging-sw.js has no empty apiKey: PASS
- public/firebase-messaging-sw.js template unchanged: PASS
- commit 67fbf0a exists: FOUND
- SUMMARY.md file exists: FOUND

---
*Phase: 01-push-notifications-setup*
*Completed: 2026-04-27*
