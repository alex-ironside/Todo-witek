---
status: human_needed
score: 6/6
---

# Phase 4 — Verification

## Automated checks

- `npm test -- --run` → **217 passed / 0 failed** (was 182 before Phase 4; net +35 after deleting legacy TodoForm/TodoItem suites).
- `npm run typecheck` → clean.
- `npm run build` → clean (Vite + Tailwind v4 + PWA).

## Requirements coverage

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| LIST-01 | App bar (hamburger, brand, cog, hairline) | ✅ code | `AppBar.test.tsx` (4 tests) |
| LIST-02 | Two segmented tabs with animated accent underline | ✅ code | `CategoryTabsBar.test.tsx` (5 tests) |
| LIST-03 | Add row: input "Co dziś robisz?" + Dodaj button, focus retention, empty-guard | ✅ code | `AddTodoRow.test.tsx` (6 tests) |
| LIST-04 | Round checkbox + title + ••• + reminder badge | ✅ code | `TodoRow.test.tsx` (7) + `ReminderBadge.test.tsx` (4) |
| LIST-05 | "Wykonane (n)" collapsible section | ✅ code | `DoneSection.test.tsx` (5 tests) |
| LIST-06 | Empty state copy "Brak zadań." + "Dodaj pierwsze powyżej." | ✅ code | `EmptyState.test.tsx` (2 tests) |

All six binding LIST requirements have automated coverage at the prop / DOM / class level. Animation timing and pixel correctness require human review.

## Why human_needed

Phase 4 ships motion-driven UI. jsdom does not run CSS, layout, or animations, so the timing and easing of the following can only be verified in a real browser:
- 180ms ease-in-out tab underline translate.
- 160ms ease-out add-row enter (currently relies on natural flex; no keyframes shipped — visual review will tell us if the spec needs the explicit animation).
- 200ms ease-out toggle-done color + line-through transition.
- 220ms ease-out done-section grid-template-rows expand.
- 220ms FLIP reorder via dnd-kit.
- 250ms long-press activation (`PointerSensor` + `TouchSensor`) with 5px tolerance.

## Human verification — please test in a real browser (`npm run dev`)

1. **Tab underline animation**
   - Open the main list. Tap `Służbowe`. The accent underline should slide from left to right over ~180ms, ease-in-out. Tap back to `Prywatne`; underline slides back symmetrically. Check that with `prefers-reduced-motion: reduce` the slide collapses to instant.

2. **Add row + focus retention**
   - Type "kup mleko" in the input, press Enter. The new row should appear at the bottom of the open list with a brief slide+fade (or at minimum appear cleanly), the input should clear, and the cursor should stay in the input ready for the next add. Try clicking `Dodaj` instead of Enter — same behavior.

3. **Toggle-done transition + Wykonane move**
   - Tap a todo's round checkbox. The checkbox should fill with the accent color and the title should fade to dimmed + strike-through over ~200ms. The row should then move into the (collapsed) `Wykonane (n)` section, with the count incrementing. Check that the open list shows `Brak zadań.` if the moved row was the last open one in that category.

4. **Wykonane collapse / expand + chevron rotation**
   - Tap the "Wykonane (n)" header. The section should expand smoothly (~220ms) and the chevron should rotate 180°. Tap again to collapse. With `prefers-reduced-motion` the height change should be instant.

5. **Long-press drag-to-reorder**
   - Add 3+ open todos. Press and hold one row for ~250ms (do not lift before that). After the activation delay, drag it up or down — the row should follow your finger/pointer with a slight scale / sheet background. Release on a target slot; the order should persist after you scroll or switch tabs (verify by reload).
   - Tap-without-holding (a quick tap) on the row body must NOT start a drag. The checkbox and ••• button must respond to taps as normal even with the long-press handler attached to the row.

6. **Reminder badge relative time**
   - Create a todo, schedule a reminder ~5 minutes in the future via the existing reminder editor (Phase 7 will replace this UI; for now it lives off the old code path or via the deferred overflow). Confirm the bell + "za 5 minut" appears under the title in dimmed text. Wait 30s — the label should refresh (e.g., "za 4 minuty") without a page reload.

## Notes

- The temporary footer strip in `App.tsx` (Wyloguj / StorageModeToggle / InstallButton / PushToggle) is intentionally retained until Phase 8 moves these into Settings. It is visually unstyled vs. the rest of the redesigned shell — that is expected.
- The legacy `ReminderEditor` is still mounted via the deleted TodoItem path. It will be removed in Phase 7 when the reminders bottom sheet ships.
