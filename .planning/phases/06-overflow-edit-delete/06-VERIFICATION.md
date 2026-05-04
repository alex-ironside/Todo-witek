---
status: human_needed
score: 4/4
---

# Phase 6 — Verification

## Automated coverage (passing)

- 270/270 unit + integration tests green (was 242 pre-phase; +28 net).
- `npm run typecheck` clean.
- `npm run build` clean (PWA SW emitted).

Coverage by requirement:

| Req | Test |
|---|---|
| ROW-01 | `MainList.test.tsx` "clicking ••• opens a menu containing Edytuj, Przypomnij, Usuń" |
| ROW-02 | `InlineEdit.test.tsx` (8 tests) + `MainList.test.tsx` Enter/Esc edit flows |
| ROW-03 | `MainList.test.tsx` "clicking Usuń once flips label", "clicking Na pewno? deletes", "after 2s reverts" |
| ROW-04 | `MainList.test.tsx` "clicking Przypomnij calls onOpenReminders with the todo id" |

## Items requiring human (browser) verification

1. **Popover positioning vs viewport edges.** Implementation right-aligns
   to the `•••` anchor with an 8px right-edge clamp. Confirm in browser
   that on narrow viewports (320–360px) and with the `•••` near the right
   edge, the menu stays fully on-screen and visually points to the trigger.
   No bottom-edge handling yet — if the row is near the bottom of the
   viewport, the menu will extend below; assess whether that's tolerable
   on real devices.

2. **Focus management when entering and leaving edit mode.** InlineEdit
   focuses + selects the input on mount; on cancel/save it unmounts
   silently. Verify in browser that focus returns to a sensible place after
   save/cancel (likely `document.body`, which on mobile is fine but may be
   surprising on desktop — consider returning focus to the `•••` button if
   the user complains).

3. **The 2-second confirm-window feel.** The first Usuń tap arms a 2s
   timer; second tap deletes; otherwise the label silently reverts to
   "Usuń". Confirm the 2s feels right on touch (long enough to read but
   short enough not to feel laggy). The popover stays open for the full 2s
   so the second tap is reachable.

4. **Zapisz button focus race during blur.** The mobile-first spec says
   blur cancels the edit. Zapisz uses
   `onMouseDown={(e) => e.preventDefault()}` to keep the input focused
   until the click handler fires; the test confirms `mouseDown.preventDefault()`
   is called, but only browser testing on iOS Safari + Android Chrome can
   confirm the actual event ordering doesn't trigger a stray cancel before
   submit.

5. **Scroll-out-of-viewport auto-close.** Not yet implemented — popover
   currently stays at its computed `top`/`right` regardless of subsequent
   scroll. If list scrolling while the menu is open looks broken, add a
   scroll listener that closes the menu (keep behavior simple: any scroll
   on the document or list container closes).
