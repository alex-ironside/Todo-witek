# Phase 5 — Drawer (Categories): Summary

**Completed:** 2026-05-04
**Status:** Implementation complete; slide animation, swipe gesture, and
focus return after close flagged human_needed (browser-only).

## What shipped

- **`src/hooks/useSwipeClose.ts`** — pointer-event-based swipe-left detector
  attached to the panel ref. Returns `{ dragX }` (clamped to `<= 0`) so the
  drawer can render the live finger offset. Calls `onClose()` once the drag
  passes the hard `-80px` threshold OR the soft `-30px` threshold with
  velocity > `0.3 px/ms`. Disabled while the drawer is closed; ignores
  gestures originating on `button/input/a/select/textarea` so internal
  controls keep working. Uses `setPointerCapture` so events keep flowing
  if the user drags off the panel.
- **`src/components/main-list/CategoryDrawerRow.tsx`** — single drawer row
  (label + trailing count). Active rows render a 3px accent vertical bar
  + `bg-bgRaised`; inactive rows reserve the same space with a transparent
  border so labels don't shift on selection. `aria-current="page"` marks the
  active row. `forwardRef` exposes the button so the Drawer can focus the
  first row on open. 44pt min hit target.
- **`src/components/main-list/Drawer.tsx`** — always-mounted left slide-in
  panel + scrim. `translate-x-0` ↔ `-translate-x-full` over 240ms ease-out
  (`motion-reduce:duration-0`). Scrim: `bg-black/50` with matching opacity
  fade. Z-indices: scrim 40, panel 50. `aria-hidden` toggled with `inert`
  while closed to prevent focus-trap leakage. Esc key closes only when open.
  Focus moves to the first category row on open and returns to the supplied
  `returnFocusRef` (the AppBar hamburger) on close. Header shows brand +
  identity; `Kategorie` overline; two `CategoryDrawerRow`s; footer
  `Ustawienia` row above a hairline (cog SVG inline). Integrates
  `useSwipeClose` and applies `transform: translateX(${dragX}px)` inline
  while open + dragging so the gesture preview wins over the Tailwind
  class.
- **`src/components/main-list/AppBar.tsx`** — converted to `forwardRef` so
  the hamburger button is reachable from `MainList` for focus return.
- **`src/components/main-list/MainList.tsx`** — owns `drawerOpen` state and
  the `hamburgerRef`. Computes per-category open-todo counts from the
  existing `useTodos` consumer in a `useMemo` (Drawer never calls
  `useTodos` itself, per CONTEXT). Removes the obsolete `onOpenDrawer`
  prop; adds optional `identity` prop threaded from `App.tsx`.
- **`src/App.tsx`** — passes `identity={identity}` to `<MainList />`.
- **`src/i18n.ts`** — added `categories: 'Kategorie'`,
  `settings: 'Ustawienia'`, `drawerClose: 'Zamknij menu'`.

## Test coverage

| Suite | Tests |
|---|---|
| `hooks/useSwipeClose.test.tsx` | 7 |
| `components/main-list/CategoryDrawerRow.test.tsx` | 5 |
| `components/main-list/Drawer.test.tsx` | 10 |
| `components/main-list/MainList.test.tsx` (delta) | +3 |
| **Phase total (new)** | **25** |

Full suite: **242 passed** (was 217 before Phase 5). Typecheck clean. Build
clean.

## Requirements satisfied

- **DRAWER-01** ✅ — Hamburger opens left drawer (`80% max-w-[320px]`) with
  scrim; tap-scrim and swipe-left both dismiss. Esc also closes.
- **DRAWER-02** ✅ — Header renders brand "Todo" + identity (email when
  Firebase, `Lokalnie` when local). Section label `Kategorie` rendered as
  uppercase overline.
- **DRAWER-03** ✅ — Two category rows with active accent bar
  (`border-l-[3px] border-accent`), raised background (`bg-bgRaised`),
  and trailing open-todo count fed from MainList's `useTodos` consumer.
- **DRAWER-04** ✅ — Footer `Ustawienia` row above a hairline; tap fires
  `onOpenSettings` (Phase 8 wires the actual screen).

## Known gaps for downstream phases

- **Settings screen** (Phase 8) — `onOpenSettings` still defaults to the
  no-op temporary footer in `App.tsx`.
- **Edge-swipe-from-left to OPEN the drawer** — explicitly deferred per
  CONTEXT; spec only requires close gesture.
- **Animation timings** (240ms slide + scrim fade) cannot be visually
  verified in jsdom; tests assert the CSS class/style presence only.
- **Swipe-close gesture velocity feel**, **focus return to hamburger on
  close**, and **`inert` focus-trap behavior** all require browser
  confirmation (see VERIFICATION).

## Files added

- `src/hooks/useSwipeClose.ts` + `.test.tsx`
- `src/components/main-list/CategoryDrawerRow.tsx` + `.test.tsx`
- `src/components/main-list/Drawer.tsx` + `.test.tsx`

## Files modified

- `src/components/main-list/AppBar.tsx` — `forwardRef` on hamburger.
- `src/components/main-list/MainList.tsx` — owns `drawerOpen` + counts +
  `hamburgerRef`; renders `<Drawer>`. `onOpenDrawer` prop removed.
- `src/components/main-list/MainList.test.tsx` — updated hamburger test
  + 3 new integration tests.
- `src/App.tsx` — passes `identity` through to `<MainList />`.
- `src/i18n.ts` — `categories`, `settings`, `drawerClose` keys added.
