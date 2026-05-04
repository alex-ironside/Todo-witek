# Phase 7 — Reminders Bottom Sheet: Summary

**Completed:** 2026-05-04
**Status:** Implementation complete; bottom-sheet motion feel, drag-down
threshold, native datetime-local picker behavior across platforms, focus
trap on mobile, and scrim tap dismissal all flagged human_needed
(browser-only verification).

## What shipped

- **`src/utils/snapToFifteen.ts`** — pure 15-min snap helper (extracted
  from `ReminderEditor.tsx` line 29). Exports `FIFTEEN_MIN_MS`. Behavior
  preserved bit-identical via `Math.round(ts / FIFTEEN_MIN_MS) *
  FIFTEEN_MIN_MS`.
- **`src/utils/formatReminderTime.ts`** — Polish absolute datetime
  formatter (`Intl.DateTimeFormat('pl-PL', …)`) for the sheet list.
  Coexists intentionally with the relative `formatRemindAt` in
  `dateUtils.ts` used by the per-row `ReminderBadge`.
- **`src/hooks/useDragToDismiss.ts`** — vertical mirror of `useSwipeClose`
  with handle-zone guard (top 32px), 80px distance threshold, 0.4 px/ms
  velocity threshold, and form-control bypass. Used by `Sheet`.
- **`src/components/main-list/Sheet.tsx`** — generic always-mounted
  bottom-sheet primitive: 24px top radius, drag handle, 220ms slide
  transform, scrim fade, Esc/scrim/drag-down close, `inert` when closed,
  focus into panel on open with restore on close. `aria-modal=true
  role=dialog aria-label={title}`. Reusable by Phase 8 (Settings).
- **`src/components/main-list/ReminderListItem.tsx`** — bell + formatted
  time + optional `wysłane` pill + trailing × remove. Removable regardless
  of fired state, preserving the pre-Phase-7 ReminderEditor behavior.
- **`src/components/main-list/RemindersSheet.tsx`** — composes Sheet +
  list (or empty-state copy `Bez przypomnień.`) + hidden datetime-local
  input + primary `Dodaj termin` (calls `inputRef.current?.showPicker?.()`
  inside try/catch) + secondary `Anuluj`. Submits go through
  `repo.update(todo.id, { reminders })` with the new entry snapped via
  `snapToFifteen`. Input value is reset post-add so the same time can be
  picked again.
- **`src/components/main-list/MainList.tsx`** — owns the new
  `remindersForId: string | null` ephemeral state (Phase 5/6 pattern).
  The `Przypomnij` overflow menu item now calls `setRemindersForId`; the
  `onOpenReminders` prop placeholder is removed entirely. `App.tsx`
  needed no change (it never wired the placeholder).
- **i18n** — added `reminderSheetTitle: 'Przypomnienia'`,
  `reminderSheetSubtitle(title)`, `reminderEmpty: 'Bez przypomnień.'`;
  flipped `reminderAdd` from `'Dodaj przypomnienie'` to spec-mandated
  `'Dodaj termin'`; reused existing `reminderFiredLabel: 'wysłane'` and
  `cancel: 'Anuluj'` (no duplicate keys).
- **Deleted** `src/components/ReminderEditor.tsx` and
  `ReminderEditor.test.tsx` — RemindersSheet subsumes both.

## Test coverage

| Suite | Tests |
|---|---|
| `utils/snapToFifteen.test.ts` | 10 |
| `utils/formatReminderTime.test.ts` | 5 |
| `hooks/useDragToDismiss.test.tsx` | 8 |
| `components/main-list/Sheet.test.tsx` | 8 |
| `components/main-list/ReminderListItem.test.tsx` | 6 |
| `components/main-list/RemindersSheet.test.tsx` | 10 |
| `components/main-list/MainList.test.tsx` (delta) | +1 (1 obsolete test re-targeted) |
| **Phase total (new)** | **48** |

Full suite: **336 passed** (baseline at start of Phase 7 was 270; another
phase landed in parallel before final tally — Phase 7 contributed +48 new
tests, retired 5 ReminderEditor tests). Typecheck clean. Build clean.

## Requirements satisfied

- **REM-01** ✅ — Bottom sheet with 24px top radius, drag handle,
  `Przypomnienia` title, todo title in `text-textDim`.
- **REM-02** ✅ — Reminders list renders bell + `formatReminderTime` +
  `wysłane` pill when `fired === true`.
- **REM-03** ✅ — Empty state renders `Bez przypomnień.` in `text-textDim`.
- **REM-04** ✅ — `Dodaj termin` button calls
  `HTMLInputElement.showPicker()`; submit snaps to 15 min and writes
  through `repo.update`.
- **REM-05** ✅ — `Anuluj` button calls `onClose`.

## Files added

- `src/utils/snapToFifteen.ts` + `.test.ts`
- `src/utils/formatReminderTime.ts` + `.test.ts`
- `src/hooks/useDragToDismiss.ts` + `.test.tsx`
- `src/components/main-list/Sheet.tsx` + `.test.tsx`
- `src/components/main-list/ReminderListItem.tsx` + `.test.tsx`
- `src/components/main-list/RemindersSheet.tsx` + `.test.tsx`

## Files modified

- `src/components/main-list/MainList.tsx` — owns `remindersForId`,
  renders `<RemindersSheet>`. `onOpenReminders` prop removed.
- `src/components/main-list/MainList.test.tsx` — re-targeted
  `Przypomnij` integration test to assert sheet visibility; new test for
  `Anuluj` close.
- `src/i18n.ts` — added/renamed reminders sheet keys.

## Files deleted

- `src/components/ReminderEditor.tsx`
- `src/components/ReminderEditor.test.tsx`

## Deviations from CONTEXT

- **Focus trap.** CONTEXT calls for "focus trap on open." Sheet
  implements focus-into-panel + restore-on-close (Drawer parity), but
  does NOT cycle Tab/Shift-Tab. Documented in code; verification flagged
  for browser confirmation.
- **`reminderAdd` key reused, not added.** CONTEXT lists
  `reminderAdd: 'Dodaj termin'` as an addition; the key already existed
  with the value `'Dodaj przypomnienie'`. We changed the value in place
  rather than adding a duplicate.
- **`reminderSent` key NOT added.** CONTEXT mentions adding
  `reminderSent: 'wysłane'`. The existing `reminderFiredLabel: 'wysłane'`
  is reused to keep the i18n table single-truth.
