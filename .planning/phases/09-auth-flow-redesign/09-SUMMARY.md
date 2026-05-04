# Phase 9 — Auth Flow Redesign — Summary

## What shipped

A three-screen mobile-first auth flow that replaces the single legacy
`Login.tsx` component:

- `LoginScreen` — email/password form with inline per-field validation,
  Firebase login, plus `Nie pamiętasz hasła?` (→ reset) and
  `Użyj trybu lokalnego` (→ exits to local mode) text links.
- `ResetPasswordScreen` — email field, busy state, on success transitions
  to the sent screen.
- `ResetSentScreen` — confirmation copy + secondary outlined "back to
  login" button.
- `AuthRouter` — local state machine `'login' | 'reset' | 'reset-sent'`,
  no router dep.

Three shared primitives live alongside: `AuthShell` (centered layout +
brand mark), `Field` (labelled `bg-bgRaised` input), `BackButton`
(chevron-left + label, 44px hit target).

## Plans / commits

| Plan | Title | Commit |
|---|---|---|
| 01 | Auth primitives — AuthShell, Field, BackButton | `feat(09): auth primitives — AuthShell, Field, BackButton` |
| 02 | LoginScreen with inline validation and Firebase login | `feat(09): LoginScreen with inline validation and Firebase login` |
| 03 | ResetPasswordScreen and ResetSentScreen | `feat(09): ResetPasswordScreen and ResetSentScreen` |
| 04 | AuthRouter, App integration, remove legacy Login | `feat(09): AuthRouter, App integration, remove legacy Login` |

## Files

**Added:** `src/components/auth/{AuthShell,Field,BackButton,LoginScreen,ResetPasswordScreen,ResetSentScreen,AuthRouter}.tsx` plus co-located `*.test.tsx`.

**Edited:** `src/App.tsx` (FirebaseApp `if (!user)` branch now renders `<AuthRouter onUseLocal={() => onModeChange('local')} />`), `src/App.test.tsx` (mock target swapped from `./components/Login` to `./components/auth/AuthRouter`), `src/i18n.ts` (added the spec keys + `authEmptyEmail`/`authEmptyPassword`; removed orphan reset-password keys).

**Deleted:** `src/components/Login.tsx`, `src/components/Login.test.tsx`.

## Test count

Baseline (start of phase): 270 tests / 39 files.
End of phase: 338 tests / 50 files. Delta: **+68 tests / +11 files**
(Phase 7 also landed during this phase; the auth-only delta is 7 files
× ~29 tests).

`npm test`, `npx tsc --noEmit`, and `npx vite build` all pass.

## Constraints honored

- Strict TS, no `any` (errors narrowed via `err instanceof Error`).
- Tailwind only — no inline styles.
- Email/password login only; no public sign-up, no social login.
- All Firebase auth calls go through the existing `src/firebase/auth.ts`
  wrappers (no SDK changes).
- `firebase/auth` is mocked at module boundary in tests, mirroring the
  prior `Login.test.tsx` pattern.

## Notes

- **No busy state on the login submit button.** The CONTEXT spec
  intentionally omits it; flagged for human verification.
- **Validation pattern shifted** from HTML `required` (browser-native)
  to JS-driven inline `text-danger` errors that clear on next change.
- **Phase 7 was running in parallel.** All Phase-7 files
  (`src/components/main-list/*`, `src/utils/snapToFifteen.ts`,
  `formatReminderTime.ts`, `useDragToDismiss.ts`,
  `RemindersSheet*`) were untouched. There were transient
  typecheck/build failures while Phase 7 was mid-flight; the final tree
  is green.
