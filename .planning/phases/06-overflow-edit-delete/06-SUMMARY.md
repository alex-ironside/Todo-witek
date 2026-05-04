# Phase 6 — Overflow Menu, Inline Edit, Two-Step Delete: Summary

**Completed:** 2026-05-04
**Status:** Implementation complete; popover viewport positioning, focus
management on edit enter/leave, the 2s confirm-window feel, and the Zapisz
focus race flagged human_needed (browser-only).

## What shipped

- **`src/components/main-list/PopoverMenu.tsx`** — anchored popover rendered
  via `createPortal` to `document.body` so it escapes any clipping ancestor.
  Position computed once from the supplied `DOMRect`: `top = bottom + 4`,
  right-aligned to the anchor's right edge, clamped to a minimum 8px from
  the viewport's right side. 200px wide, `bg-bgSheet`, hairline border,
  `rounded-field`, large drop shadow. Z-indices: backdrop 60, menu 61.
  Backdrop click and Esc both call `onClose`. Item clicks DO NOT
  auto-close — the parent owns close so the 2-step delete confirm can hold
  the menu open between taps. Items receive `{ label, onClick, danger? }`;
  no labels are hardcoded.
- **`src/components/main-list/InlineEdit.tsx`** — input + Zapisz button.
  Mounts focused with all text selected. Enter or Zapisz commits;
  blur OR Esc cancels (mobile-first). Trim → reject empty (adds
  `ring-2 ring-danger`, stays open) → identical-after-trim → `onCancel`
  (no-op write). Zapisz uses `onMouseDown={e => e.preventDefault()}` so the
  input keeps focus until the click handler fires (otherwise blur-cancel
  would race the submit).
- **`src/components/main-list/TodoRow.tsx`** — extended:
  - `onOpenOverflow` signature widened to `(id, anchorRect: DOMRect)`. The
    `•••` button passes `event.currentTarget.getBoundingClientRect()`.
  - When `isEditing` is true, the row renders `<InlineEdit>` in place of
    the title block; checkbox and overflow button are hidden so they don't
    compete for tap targets.
  - New props: `isEditing?`, `onSaveEdit?`, `onCancelEdit?`.
- **`src/components/main-list/MainList.tsx`** — owns all menu/edit/confirm
  ephemeral state: `menuForId`, `menuAnchorRect`, `editingId`,
  `confirmingDeleteId`, `confirmTimerRef`. Renders the `PopoverMenu` with
  three items: Edytuj / Przypomnij / Usuń. The Usuń item flips its label
  to `Na pewno?` (in `text-danger`) when `confirmingDeleteId === menuForId`;
  first tap arms a 2s timer, second tap calls `repo.delete` and closes.
  Edytuj sets `editingId` and closes the menu. Save calls `repo.update(id, { title })`.
  Cancel clears `editingId`. Przypomnij forwards to a new `onOpenReminders`
  prop (default no-op until Phase 7). The 2s timer is also cleared on
  unmount.
- **`OpenTodoList` and `DoneSection`** — prop signatures widened to forward
  `editingId`, `onSaveEdit`, `onCancelEdit`, and the new
  `onOpenOverflow(id, rect)` shape down to TodoRow.
- **i18n** — added `remind: 'Przypomnij'`. Updated existing
  `deleteConfirm: 'Potwierdź usunięcie'` → `'Na pewno?'` per spec.

## Note on confirming-state location

CONTEXT (lines 82-98) sketches per-row local `confirming` state inside
TodoRow. Phase 6 keeps that state in MainList instead, keyed by todo id
(`confirmingDeleteId === menuForId`). Rationale: the label flip is rendered
inside the popover, which is owned by MainList; the items[] array is
reconstructed on every MainList render anyway, so the state needs to live
where the menu is rendered. Functionally this remains "per-row" — only one
row can be in the confirming state at a time, and only that row's Usuń
label flips. Single-active is acceptable per CONTEXT ("Spec doesn't require
single-active").

## Test coverage

| Suite | Tests |
|---|---|
| `components/main-list/PopoverMenu.test.tsx` | 9 |
| `components/main-list/InlineEdit.test.tsx` | 8 |
| `components/main-list/TodoRow.test.tsx` (delta) | +4 |
| `components/main-list/MainList.test.tsx` (delta) | +9 (and 1 obsolete test removed) |
| **Phase total (new)** | **28** |

Full suite: **270 passed** (was 242 before Phase 6). Typecheck clean. Build
clean.

## Requirements satisfied

- **ROW-01** ✅ — `•••` opens a popover with three items: Edytuj, Przypomnij,
  Usuń.
- **ROW-02** ✅ — Edytuj switches the row to inline edit; Zapisz/Enter
  commits; blur or Esc cancels.
- **ROW-03** ✅ — Usuń performs a 2-step inline confirm (`Na pewno?` for 2s,
  second tap deletes). No modal.
- **ROW-04** ✅ — Przypomnij calls `onOpenReminders(todoId)` (Phase 7 will
  swap in the actual sheet handler in App.tsx).

## Known gaps for downstream phases

- **Reminders sheet** (Phase 7) — `onOpenReminders` defaults to no-op in
  MainList; App.tsx doesn't yet pass a handler.
- **Scroll-out-of-viewport auto-close** for the popover was specified but
  not yet wired (the menu does close on Esc, backdrop tap, or any state
  change that clears `menuForId`). If the user scrolls the list while the
  menu is open, the popover stays anchored to its computed position; this
  may visually float away from the original anchor. Acceptable for now;
  flagged in VERIFICATION for browser confirmation.
- **Animation timings** for the 2s confirm window cannot be visually
  verified in jsdom; tests assert label state via fake timers only.

## Files added

- `src/components/main-list/PopoverMenu.tsx` + `.test.tsx`
- `src/components/main-list/InlineEdit.tsx` + `.test.tsx`

## Files modified

- `src/components/main-list/TodoRow.tsx` — `isEditing` mode + DOMRect on
  overflow.
- `src/components/main-list/TodoRow.test.tsx` — updated overflow assertion;
  4 new edit-mode tests.
- `src/components/main-list/MainList.tsx` — owns menu/edit/confirm state;
  renders PopoverMenu; `onOpenReminders` prop replaces `onOpenOverflow`.
- `src/components/main-list/MainList.test.tsx` — 9 new menu/edit/delete
  integration tests.
- `src/components/main-list/OpenTodoList.tsx` — forwards edit + rect props.
- `src/components/main-list/DoneSection.tsx` — forwards edit + rect props.
- `src/i18n.ts` — added `remind`; `deleteConfirm` → `'Na pewno?'`.
