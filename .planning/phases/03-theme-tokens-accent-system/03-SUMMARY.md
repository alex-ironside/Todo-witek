# Phase 3 — Theme Tokens & Accent System: Summary

**Completed:** 2026-05-04
**Status:** Implementation complete; one item flagged human_needed.

## What shipped

- **Tailwind v4** installed (`tailwindcss@^4`, `@tailwindcss/vite`) and wired into `vite.config.ts`. Replaces the legacy `index.css` token system.
- **OKLCH @theme block** in `src/index.css` declares all 11 color tokens, three radii (`field`/`group`/`sheet`), and `--font-sans` (Inter). Tailwind auto-derives utilities (`bg-bg`, `text-textDim`, `border-hairlineSoft`, etc.).
- **Typed accent palette** in `src/theme/accents.ts` — 5 keys (`amber|rose|mint|violet|sky`), Polish labels (Bursztyn/Róż/Mięta/Fiolet/Błękit), default = `amber`.
- **Accent service** in `src/services/accent.ts` — get/set/observer mirroring `storageMode`. Persists to `localStorage` (`tw:accent`). Sets `--color-accent` and `--color-accentInk` on `document.documentElement` at runtime.
- **Firestore wrapper** in `src/firebase/accent.ts` — `getCloudAccent`/`setCloudAccent` reading/writing `users/{uid}/preferences/accent` with shape `{ value: AccentKey }`. Validates returned value against `ACCENTS`.
- **firestore.rules** extended: `users/{userId}/preferences/{document}` is read/write only for the matching uid.
- **`useAccent` hook** in `src/hooks/useAccent.ts` — returns `[accent, setAccent]`. Seeds from localStorage. In cloud mode + signed-in, reconciles with Firestore on auth-ready (cloud wins; if missing, pushes local up); subsequent local sets debounce (250ms) writes back. No write-back for the initial reconciled value.

## Test coverage

| Suite | Tests |
|---|---|
| `index.css.test.ts` (THEME-01/03 token presence) | 15 |
| `accents.test.ts` (THEME-02 palette shape) | 9 |
| `services/accent.test.ts` | 7 |
| `firebase/accent.test.ts` (mocked SDK) | 5 |
| `hooks/useAccent.test.tsx` (renderHook + fake timers) | 10 |
| **Phase total** | **46** |

Full suite: 182 passed (was 136 before Phase 3). Typecheck clean. Build clean.

## Requirements satisfied

- **THEME-01** ✅ — All token CSS variables exist on `:root` (via Tailwind's `@theme` → `:root` emission). Smoke tests assert presence of all 11 color tokens, 3 radii, and font-sans.
- **THEME-02** ✅ (code-verifiable) / human_needed (live UI) — `useAccent` returns/sets one of five accents; persists in localStorage in local mode and Firestore (`users/{uid}/preferences/accent`) in cloud mode. Setter updates `--color-accent` and `--color-accentInk` live without reload.
- **THEME-03** ✅ — Typography (Inter via `--font-sans`), radii (12/16/24), and the single sheet/drawer shadow approach codified in tokens. Other shadows are not declared as utilities.

## Known gaps for downstream phases

- **No accent picker UI** — that's Phase 8 (SET-03). `useAccent` is the integration point.
- **No usage of new utilities yet** — existing components in `src/components/*` still use the old class names (`.todo`, `.card`, `.row`, `.login`). Visual regression intentional and accepted (per CONTEXT.md decision); Phase 4 begins the rebuild.
- **Sheet/drawer shadow** — not declared as a custom utility yet; it's a one-liner the consumer phases (5, 7) will define inline.

## Files added

- `src/index.css` (rewritten)
- `src/index.css.test.ts`
- `src/theme/accents.ts` + `.test.ts`
- `src/services/accent.ts` + `.test.ts`
- `src/firebase/accent.ts` + `.test.ts`
- `src/hooks/useAccent.ts` + `.test.tsx`
- `firestore.rules` (modified)
- `package.json` + `vite.config.ts` (modified)
