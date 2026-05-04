---
status: human_needed
score: 5/5
---

# Phase 7 — Verification

## Automated

- `npm test -- --run` → **336 passed** (Phase 7 contributed +48 new tests
  and retired 5 ReminderEditor tests).
- `npm run typecheck` → clean.
- `npm run build` → clean.

## Requirements

| ID | Status | Note |
|---|---|---|
| REM-01 | passed (auto) | Sheet primitive + `Przypomnienia` title + subtitle in `text-textDim`. |
| REM-02 | passed (auto) | List + bell SVG + `wysłane` pill on fired only. |
| REM-03 | passed (auto) | `Bez przypomnień.` empty-state copy. |
| REM-04 | passed (auto) — picker UX human_needed | Snap math unit-tested; `showPicker` mocked in tests; OS-native picker behavior must be confirmed in real browsers. |
| REM-05 | passed (auto) | `Anuluj` calls `onClose`; sheet visibility flips to `translate-y-full`. |

## Human items

1. **Bottom-sheet motion feel.** 220ms ease-out slide-up + scrim fade.
   Confirm the cubic curve feels right on iOS Safari and Android Chrome
   (`motion-reduce` is honored — verify with reduced-motion preference).
2. **Drag-down dismiss threshold.** 80px distance / 0.4 px/ms velocity.
   These were tuned slightly higher than the drawer's swipe-close to
   reduce mis-fires when the user is just scrolling the list. Confirm in
   touch use that legitimate close gestures aren't fighting list scroll.
3. **Native datetime-local picker.** `inputRef.current?.showPicker?.()`
   inside try/catch. Confirm that on Safari iOS, Chrome Android, and
   desktop the OS picker opens on `Dodaj termin` tap (the input itself is
   `sr-only` so no fallback affordance is visible — if `showPicker`
   silently no-ops on a target browser, document it and add a visible
   fallback affordance).
4. **Focus trap.** Sheet does focus-into-panel + restore-on-close (Drawer
   parity) but does NOT cycle Tab/Shift-Tab. Confirm screen reader and
   keyboard users can still exit the sheet (Esc) without focus
   escaping; if this is unacceptable for accessibility, build a true Tab
   trap in a follow-up.
5. **Scrim tap dismiss.** Backdrop is a `fixed inset-0` div above the
   list (z-40) with the panel at z-50. Confirm scrim taps don't fall
   through on touch devices and that the row underneath is not
   accidentally activated.
