---
status: human_needed
score: 3/3
---

# Phase 9 — Verification

## Automated

- `npx vitest run` → 338 tests, 50 files, all green.
- `npx tsc --noEmit` → clean.
- `npx vite build` → clean.

## Human verification needed

1. **Real Firebase login end-to-end.** Sign in with a known account
   against the live Firebase project; confirm the LoginScreen submits,
   succeeds, and the app transitions to the authenticated shell.
2. **Reset-password email actually arrives.** Click `Nie pamiętasz
   hasła?`, submit a real address, confirm the reset email is delivered
   by Firebase and the app shows the `Sprawdź skrzynkę` confirmation.
3. **Busy/transition affordances.** Verify the `Wysyłanie…` state is
   visible during slow networks on the reset screen, and consider whether
   a push-from-right transition between the three auth screens is wanted
   (currently absent — screens swap instantly).
