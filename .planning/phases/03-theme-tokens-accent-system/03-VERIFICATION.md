---
status: human_needed
score: 2/3
---

# Phase 3 Verification — Theme Tokens & Accent System

**Date:** 2026-05-04

## Requirement-by-requirement

### THEME-01 — OKLCH token system reachable as CSS variables and TS constants ✅

- All 11 color tokens declared in `src/index.css` `@theme` block.
- Smoke test (`src/index.css.test.ts`) asserts presence of every token by regex.
- Tailwind v4 emits each `--color-*` to `:root` automatically.
- TS constants for accent values exposed via `src/theme/accents.ts` (`ACCENTS`, `ACCENT_KEYS`, `DEFAULT_ACCENT`).
- 9 accent-shape tests + 15 CSS-token tests pass.

### THEME-02 — Accent picker (5 colors), persists per user, applies app-wide ⚠ partial / human_needed

- ✅ `useAccent` returns/sets one of five accents — verified by 10 hook tests.
- ✅ localStorage persistence in local mode — 3 service tests + 2 hook tests cover seed and round-trip.
- ✅ Firestore persistence in cloud mode (`users/{uid}/preferences/accent`) — 5 wrapper tests + 4 hook tests verify get/set/reconcile/debounce.
- ✅ Setter updates `--color-accent` and `--color-accentInk` on `document.documentElement` live (no reload) — verified via `getPropertyValue` in service test.
- ⚠ **human_needed**: there is no UI to drive `useAccent` until Phase 8 (SET-03), so the "applies app-wide as `--accent`" claim cannot be visually verified in this phase. Smoke covered programmatically; live visual confirmation pending Phase 8.
- ⚠ **human_needed**: `firestore.rules` change has unit tests at the wrapper layer but no emulator-rules harness exists in this repo. Manual deploy + verification required when next deploying rules.

### THEME-03 — Typography, spacing, radii, single sheet/drawer shadow ✅

- ✅ `--font-sans: Inter, ...` declared and asserted by smoke test.
- ✅ `--radius-field: 12px`, `--radius-group: 16px`, `--radius-sheet: 24px` declared and asserted.
- ✅ Spacing scale (4/8/12/16/20/24/32/40 px) is a subset of Tailwind defaults — no extra config needed.
- ✅ No additional shadow tokens declared, leaving the sheet/drawer shadow as the only one consumers (Phases 5, 7) will use inline. Spec calls this an explicit constraint, not a token.

## Score

| Item | Status |
|---|---|
| THEME-01 (CSS vars + TS constants reachable) | ✅ verified |
| THEME-02 (5-accent picker, persistence, live apply) | ⚠ partial — see below |
| THEME-03 (typography/spacing/radii/shadow constraint) | ✅ verified |

**2 of 3 must-haves fully verified by automated tests. THEME-02 is code-complete and unit-verified end-to-end, but the user-facing "lights up correctly when picked from a UI" check is impossible in this phase (no UI exists). Marked `human_needed` until Phase 8 wires the picker.**

## Human verification items

1. **After Phase 8 ships the accent picker UI**: pick each of the 5 accents in turn; confirm immediate visual change (no reload), confirm change persists across refresh in both local and cloud modes, confirm cross-device sync in cloud mode.
2. **Before deploying `firestore.rules`**: deploy to a staging Firebase project, run a manual test where (a) authenticated user reads/writes their own `users/{uid}/preferences/accent` succeeds, (b) any read or write of another user's preferences doc denies.

## Test results

- Full suite: **182 / 182 passing**
- Typecheck: **clean** (`tsc --noEmit`)
- Build: **clean** (`vite build`, 791 KiB precache)

## Commits in this phase

```
eeea760 feat(03): add accent service with localStorage + CSS var apply
2ec2267 feat(03): add typed accent palette
39ee699 feat(03): install Tailwind v4 and lock OKLCH theme tokens
6a... (this commit) feat(03): add Firestore accent wrapper and preferences rules
... (this commit) feat(03): add useAccent hook with cloud reconcile
```
