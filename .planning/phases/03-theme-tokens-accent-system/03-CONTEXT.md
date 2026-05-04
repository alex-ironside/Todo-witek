# Phase 3: Theme Tokens & Accent System — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive (user answered all gray areas)

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — locked hifi spec. **MUST read before planning.** Source of all token values, accent palette, typography scale, spacing scale, radii, and shadow rules.
- `.planning/REQUIREMENTS.md` — THEME-01, THEME-02, THEME-03 (binding requirements for this phase).
- `CLAUDE.md` — strict TS, no `.js`/`.jsx` source, Vitest+RTL, TDD, Firebase wrappers in `src/firebase/*`.
- `src/firebase/auth.ts` — auth observer pattern (model for hooking into user identity for cloud-mode reads).
- `src/services/storageMode.ts` + `src/hooks/useStorageMode.ts` — getter/setter + observer pattern to mirror for `useAccent`.
- `src/firebase/pushTokens.ts` — existing pattern for `users/{uid}/...` subcollection writes.

</canonical_refs>

<domain>

## Phase Boundary

Lock the OKLCH token system into the codebase, integrate **Tailwind v4** as the styling layer, and add a per-user accent picker (5 colors) that persists across sessions and applies app-wide via a single `--accent` CSS variable.

This phase delivers infrastructure only — no screen redesigns. Phases 4–9 consume the tokens and `useAccent` hook to rebuild the UI.

**In scope:**
- Tailwind v4 install + Vite plugin wiring.
- `src/index.css` rewritten with `@theme` declaring all OKLCH tokens.
- `src/theme/accents.ts` — typed accent map (`amber|rose|mint|violet|sky` → `{ oklch, ink, polishLabel }`).
- `src/services/accent.ts` — getter/setter/observer for the active accent (mirrors `storageMode` pattern).
- `src/firebase/accent.ts` — Firestore wrapper at `users/{uid}/preferences/accent`.
- `src/hooks/useAccent.ts` — returns `[accent, setAccent]`, persists per active storage mode.
- Live application: setting accent updates `--accent` and `--accentInk` on `document.documentElement` immediately.

**Out of scope (other phases):**
- Any screen redesign (Phases 4–9).
- Settings UI for the accent picker (Phase 8: SET-03).
- Density variants (REQUIREMENTS out-of-scope: ship `balanced` only).

</domain>

<decisions>

## Implementation Decisions

### Styling layer — Tailwind v4 with @theme

- Install `tailwindcss@^4` and `@tailwindcss/vite`.
- Add the Vite plugin to `vite.config.ts`.
- `src/index.css` becomes:
  ```css
  @import "tailwindcss";

  @theme {
    --color-bg: oklch(0.18 0.008 60);
    --color-bgRaised: oklch(0.22 0.009 60);
    --color-bgSheet: oklch(0.24 0.010 60);
    --color-hairline: oklch(0.30 0.008 60);
    --color-hairlineSoft: oklch(0.26 0.008 60);
    --color-text: oklch(0.96 0.005 80);
    --color-textDim: oklch(0.72 0.012 70);
    --color-textMute: oklch(0.55 0.010 70);
    --color-accent: oklch(0.78 0.13 70);     /* default = amber, runtime-overridable */
    --color-accentInk: oklch(0.20 0.020 60);
    --color-danger: oklch(0.65 0.18 25);

    --radius-field: 12px;
    --radius-group: 16px;
    --radius-sheet: 24px;

    --font-sans: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  ```
- Tailwind v4 auto-derives utilities: `bg-bg`, `bg-bgRaised`, `bg-bgSheet`, `text-text`, `text-textDim`, `text-textMute`, `border-hairline`, `border-hairlineSoft`, `bg-accent`, `text-accentInk`, `text-danger`, `rounded-field`, `rounded-group`, `rounded-sheet`.
- Spacing scale (4/8/12/16/20/24/32/40 px) is a subset of Tailwind defaults — use `p-1 p-2 p-3 p-4 p-5 p-6 p-8 p-10`. No extra config.
- Sheet/drawer shadow declared as a custom utility in CSS (`@utility shadow-sheet { ... }`) rather than a config entry — only one shadow exists in the design.
- **No JSX-side TS color constants are exported.** THEME-01's "TS constants" requirement is satisfied by `accents.ts` (the only token values code consumes outside CSS are accent values for `setProperty` calls). Token names are not stringly-typed in app code — components use Tailwind utility classes.

### Accent palette — typed, single source

Create `src/theme/accents.ts`:

```ts
export const ACCENTS = {
  amber:  { oklch: 'oklch(0.78 0.13 70)',  ink: 'oklch(0.20 0.020 60)', label: 'Bursztyn' },
  rose:   { oklch: 'oklch(0.74 0.13 18)',  ink: 'oklch(0.20 0.020 60)', label: 'Róż' },
  mint:   { oklch: 'oklch(0.78 0.11 165)', ink: 'oklch(0.20 0.020 60)', label: 'Mięta' },
  violet: { oklch: 'oklch(0.72 0.13 290)', ink: 'oklch(0.20 0.020 60)', label: 'Fiolet' },
  sky:    { oklch: 'oklch(0.78 0.10 235)', ink: 'oklch(0.20 0.020 60)', label: 'Błękit' },
} as const;

export type AccentKey = keyof typeof ACCENTS;
export const DEFAULT_ACCENT: AccentKey = 'amber';
```

Keys are internal (English); labels are Polish (Bursztyn / Róż / Mięta / Fiolet / Błękit) per spec.

### Persistence — local + cloud

Mirror the existing `storageMode` pattern with one extra layer for cloud sync.

- **Local mode (or signed out):** `localStorage` key `tw:accent` holds the AccentKey. Default: `amber`.
- **Cloud mode (signed in):** Firestore doc `users/{uid}/preferences/accent` with shape `{ value: AccentKey }`.
- **Read priority on auth-ready:** if cloud value exists, it wins and is mirrored to localStorage. If missing, push localStorage value up.
- **Write:** every `setAccent` writes to localStorage immediately (instant apply) and, when in cloud mode with auth, fires a debounced (250ms) Firestore write.
- **firestore.rules:** add a rule allowing `request.auth.uid == userId` to read/write `users/{userId}/preferences/{document}`. Same shape as the existing rules for the user's todos.

### Accent applied at runtime

`src/services/accent.ts` exposes `setAccent(key)` which:
1. Writes to localStorage.
2. Calls `document.documentElement.style.setProperty('--color-accent', ACCENTS[key].oklch)` and `--color-accentInk`.
3. Notifies subscribers (so React re-renders).
4. If cloud mode + signed in, schedules Firestore write.

`useAccent()` returns `[accent, setAccent]`. On first mount it:
- Reads localStorage synchronously to seed initial state (no flash of default color).
- Subscribes to auth changes; on auth ready in cloud mode, fetches `preferences/accent` and reconciles.

The CSS variable name is `--color-accent` (Tailwind v4 convention) — `bg-accent` resolves to it. Setting via `setProperty` is the runtime swap mechanism.

### Replace index.css wholesale

The current `index.css` (`--panel`, `--muted`, `.todo`, `.card`, `.row`, `.login`, etc.) is **deleted** and replaced by the @theme block plus a small base layer (font-family, body bg). Existing components in `src/components/*` will look broken after Phase 3 ships — this is accepted per user decision. Phases 4–9 will rebuild each screen on Tailwind utilities.

**Test impact:** existing component tests assert behavior, not styles, so they continue to pass. Smoke tests for `:root` token presence are added in Phase 3.

### TDD for this phase

- **`accents.test.ts`** — pure: shape of ACCENTS, default key, all five labels are Polish.
- **`accent.test.ts` (service)** — pure: get/set/subscribe; localStorage round-trip; CSS var write via `document.documentElement.style.getPropertyValue` after set.
- **`useAccent.test.tsx`** — RTL: hook returns initial value from localStorage; setting updates value + `--color-accent`; cloud-mode mock sync (mock `firebase/accent.ts` at module boundary).
- **`firebase/accent.test.ts`** — mock Firestore SDK; assert correct `users/{uid}/preferences/accent` doc path and `{ value }` shape.
- **CSS smoke test** — render `<App />`, assert `getComputedStyle(document.documentElement).getPropertyValue('--color-bg')` is non-empty (proves Tailwind theme loaded).
- **Firestore rules test** — extend `firestore.rules` test to cover the new `preferences/{document}` path (read/write own, deny others).

### Folded todos / follow-ups

None — no pending todos matched this phase.

</decisions>

<code_context>

## Existing Code Insights

- `src/services/storageMode.ts` is the canonical pattern for a singleton-with-observer service: a module-scope value, `subscribe(fn)` returning an unsubscribe, and a `set` that notifies subscribers. `accent.ts` will follow this exactly.
- `src/hooks/useStorageMode.ts` is two lines of glue — same shape applies to `useAccent`.
- `src/firebase/pushTokens.ts` already writes under `users/{uid}/...`; `firebase/accent.ts` follows the same wrapper convention (no direct `firebase/firestore` imports outside `src/firebase/`).
- `src/firebase/auth.ts` exports `observeAuth` — `useAccent` uses this to know when to do the cloud-side reconcile.
- `vite.config.ts` already runs the VitePWA plugin and a custom `writeBundle` step for SW stamping. The Tailwind Vite plugin sits before VitePWA in the plugin array.
- `src/test/setup.ts` already configures jsdom; CSS-var assertions work because jsdom honors `style.setProperty`/`getPropertyValue`. Tailwind utilities are not actually applied in jsdom (no compiled CSS in test bundle), but tests don't depend on visual rendering.

</code_context>

<specifics>

## Specific Ideas

- **Default accent = `amber`** (Bursztyn) per spec.
- **Five accent keys exactly:** `amber | rose | mint | violet | sky`. No more, no fewer.
- **Polish labels exposed as `ACCENTS[key].label`** — Phase 8's settings UI will read these directly.
- **`--color-accent` and `--color-accentInk` are the only CSS vars mutated at runtime.** All other tokens are static.
- **Tailwind v4, not v3.** Use `@tailwindcss/vite` plugin, no `tailwind.config.js`.
- **Debounced Firestore writes** (250ms) to avoid spam if user clicks through swatches.
- **Auth state interplay:** logging out clears localStorage accent? **No** — localStorage persists across logout so the same device keeps the user's last accent. On next login (cloud mode), Firestore value wins.

</specifics>

<deferred>

## Deferred Ideas

- **Density variants** (compact / airy) — out of scope for v1.1 per REQUIREMENTS.
- **Light theme / system theme detection** — not in spec.
- **Reduce-motion preference** — could share the `users/{uid}/preferences/` subcollection later, not this phase.
- **Custom user-defined accent (color picker)** — out of scope; spec locks 5.
- **Migrating away from VitePWA's CSS handling** — current setup works; Tailwind v4 plugin coexists.

</deferred>
