---
status: human_needed
score: 4/4
---

# Phase 5 — Drawer (Categories): Verification

## Automated checks

- `npm test -- --run` → **242 passed** (was 217 pre-phase; +25 net).
- `npm run typecheck` → clean.
- `npm run build` → clean (precache 805.38 KiB / 7 entries).

## Requirements

- **DRAWER-01** ✅ — covered by `Drawer.test.tsx` "scrim click fires
  onClose", `useSwipeClose.test.tsx` threshold/velocity tests, and the
  `MainList.test.tsx` "hamburger opens the drawer" integration test.
- **DRAWER-02** ✅ — `Drawer.test.tsx` asserts `Todo` brand, identity
  string, and `Kategorie` overline.
- **DRAWER-03** ✅ — `Drawer.test.tsx` + `CategoryDrawerRow.test.tsx`
  cover labels, counts, active-bar classes, `aria-current`. MainList
  integration test asserts counts reflect open-todo subset per category.
- **DRAWER-04** ✅ — `Drawer.test.tsx` "clicking Ustawienia fires
  onOpenSettings and onClose".

## Why human_needed

The following are real product behaviors that jsdom cannot validate; they
need a browser pass on a touch device (or DevTools touch-emulation):

1. **Slide animation.** Drawer panel + scrim should animate over 240ms
   ease-out on open AND close — with no jank, no flash of unstyled
   offscreen content on first paint, and `motion-reduce` users seeing an
   instant snap.
2. **Swipe-close gesture feel.** With drawer open, swipe-left across the
   panel: the panel should follow the finger (live `dragX` translate),
   release past 80px hard threshold should commit close, release at
   30–80px with quick velocity should also commit close, slow short
   swipes should spring back to fully open.
3. **Focus return to hamburger.** Open drawer → confirm a category row
   is focused → close via Esc / scrim / swipe / row-click. After each
   close path, focus should land back on the AppBar hamburger button.
4. **`inert` focus-trap behavior.** With drawer closed, `Tab` through the
   page must NOT land inside the drawer's category rows or the
   Ustawienia button (verifies `inert` applies, not just `aria-hidden`).
5. **Swipe ignores interactive children.** Press-and-drag starting on the
   `Ustawienia` button or a category row should NOT begin a panel-drag
   gesture (i.e. tapping/clicking those works normally, no drift).

## Score 4/4

All four DRAWER requirements have automated test coverage AND a
human-confirmable manual checklist above.
