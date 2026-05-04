# Phase 6: Overflow Menu, Inline Edit, Two-Step Delete — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive (minimal questions; designs locked most choices)

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — section "1. Main list" → "Per-row overflow menu"; "Interactions & Behavior" → Delete + Add todo + Toggle done.
- `redesign/design_handoff_todo_witek/app.jsx` — `PopoverMenu` (line 210), `menuFor` state (line 698) — locks the menu surface as a popover anchored to the `•••` button, not a bottom sheet.
- `.planning/REQUIREMENTS.md` — ROW-01..ROW-04 binding.
- `.planning/phases/04-main-list-redesign/04-CONTEXT.md` — TodoRow exposes `onOpenOverflow(todoId)` (Phase 4 wires it as a no-op default; Phase 6 owns the actual handler in MainList).
- `src/repos/firebaseTodoRepo.ts` and `localTodoRepo.ts` — already implement `update(id, partial)` and `remove(id)`.

</canonical_refs>

<domain>

## Phase Boundary

Wire the `•••` button into a popover menu with Edytuj / Przypomnij / Usuń. Implement inline edit mode and the 2-step inline delete confirmation. `Przypomnij` calls `onOpenReminders(todoId)` whose default no-ops until Phase 7.

**In scope:**
- `src/components/main-list/PopoverMenu.tsx` — anchored popover with backdrop, close-on-outside-click and Esc.
- `src/components/main-list/InlineEdit.tsx` — input + Zapisz button replacing the row content while editing.
- `src/components/main-list/TodoRow.tsx` — extend (from Phase 4) to render edit mode and the "Na pewno?" delete state.
- MainList state additions: `menuForId: string | null`, `menuAnchorRect: DOMRect | null`, `editingId: string | null`.
- i18n additions: `edit: 'Edytuj'`, `delete: 'Usuń'`, `deleteConfirm: 'Na pewno?'`, `remind: 'Przypomnij'`, `save: 'Zapisz'`.

**Out of scope:**
- Reminders sheet UI — Phase 7. We only call `onOpenReminders(todoId)` here.
- Settings — Phase 8.

</domain>

<decisions>

## Implementation Decisions

### Menu surface — popover, anchored to `•••`

Per `app.jsx` line 698 the design uses a popover (not bottom sheet). Implementation:

- `PopoverMenu` renders `position: fixed` with `top`/`left` calculated from the `•••` button's `getBoundingClientRect()` + 4px offset.
- 200×auto, `bg-bgSheet` background, `border border-hairline`, `rounded-field`, `shadow-sheet`.
- Items: Edytuj / Przypomnij / Usuń, each `h-11 px-3 text-text` for ≥44pt tap target.
- Click outside (capture-phase listener) + Esc key close menu.
- When the anchor scrolls out of viewport, menu closes (cheap: listen on the scroll container).
- Z-index 60 (above scrim from drawer if both ever overlap).

`MainList` owns `menuForId` and `menuAnchorRect`. TodoRow's `•••` calls `onOpenOverflow(todoId, anchorRect)` — anchor is `event.currentTarget.getBoundingClientRect()`.

### Inline edit — discard on blur or Esc, mobile-first

Per spec: blur OR Esc cancels. On mobile this means tap-outside discards (which is what blur becomes when another element receives focus). Save only via Zapisz button or Enter key.

- `editingId` lives in MainList (single editor at a time globally).
- TodoRow renders `<InlineEdit>` when `editingId === todo.id`, else normal content.
- `<InlineEdit>` receives `initialTitle`, `onSave(title)`, `onCancel()`. Internal `value` state seeded from `initialTitle`. Submit sources: Enter key, Zapisz button.
- Mount focuses the input and selects all text.
- On blur → `onCancel()` (note: clicking Zapisz must NOT trigger blur-cancel before submit fires; use `onMouseDown={e => e.preventDefault()}` on Zapisz to keep focus until click handler runs).
- Esc → `onCancel()`.

### Edit save validation — trim, reject empty, dedupe

```ts
const next = value.trim();
if (!next) {
  setError(true);  // adds danger ring, focus stays
  return;
}
if (next === initialTitle) {
  onCancel();      // no-op write
  return;
}
onSave(next);      // → repo.update(id, { title: next })
```

### 2-step delete — local state per row

In `TodoRow`:

```tsx
const [confirming, setConfirming] = useState(false);
const timerRef = useRef<number | null>(null);

const startDelete = () => {
  setConfirming(true);
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = window.setTimeout(() => setConfirming(false), 2000);
};
const confirmDelete = () => {
  if (timerRef.current) clearTimeout(timerRef.current);
  onDelete(todo.id);
};

useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```

Visual: when `confirming`, the menu's "Usuń" item flips its label to `Na pewno?` in `text-danger`. Tapping it again fires `confirmDelete`. The 2s timer resets `confirming` back to false.

Multiple rows can independently get into the confirming state (last clicked is the one with the timer). Spec doesn't require single-active. Keeping per-row simplifies logic.

The popover stays open during the 2-second confirm window (so the user can see and tap the second confirm). Tapping outside or Esc closes the popover and cancels the confirm.

### Wiring to existing repo

- `onSave(title)` → `repo.update(todo.id, { title })`.
- `onDelete(id)` → `repo.remove(id)`.
- `onOpenOverflow(id, anchorRect)` → set `menuForId`, `menuAnchorRect`, `confirming` reset.
- `onOpenReminders(id)` → no-op default; Phase 7 will swap in a real handler.

### Replace existing edit/delete affordances

Phase 4's TodoRow already deleted the old TodoItem. Phase 6 adds edit/delete behavior to TodoRow + the new PopoverMenu. No legacy components remain.

### TDD

- `PopoverMenu.test.tsx` — renders items, click outside closes, Esc closes, click item fires its handler.
- `InlineEdit.test.tsx` — focuses + selects on mount; Enter submits trimmed; empty-after-trim shows danger and stays open; identical-to-initial calls onCancel; Esc cancels; blur cancels; clicking Zapisz submits without triggering blur-cancel race.
- `TodoRow.test.tsx` (extended) — clicking ••• calls onOpenOverflow with rect; in edit mode renders InlineEdit; after first Usuń tap label becomes "Na pewno?", second tap calls onDelete; 2s timer resets confirming.
- `MainList.test.tsx` (extended) — full flow: ••• → menu opens → Edytuj → row swaps to edit input → Enter saves to repo → row returns to normal view.

</decisions>

<code_context>

## Existing Code Insights

- All repos already implement `remove(id)` (used by previous TodoItem).
- Tailwind v4's `bg-danger` / `text-danger` utilities resolve to `--color-danger` (oklch warm red) — matches the spec's `Na pewno?` copy color.
- Phase 4 establishes the TodoRow shape with `onOpenOverflow` callback prop. Phase 6 fills in the handler via state in MainList.
- `KeyboardEvent.key === 'Escape'` is the cross-platform check (don't use deprecated `keyCode`).

</code_context>

<specifics>

## Specific Ideas

- Menu anchor: 4px below the `•••` button, right-aligned to the button's right edge.
- 2s confirm timeout: reset on second tap (no double-counting).
- Menu width: 200px fits all three Polish labels comfortably.
- Edit mode input: `bg-bgRaised`, `rounded-field`, full row width minus Zapisz button (matches Add row aesthetic from Phase 4).

</specifics>

<deferred>

## Deferred Ideas

- **Swipe-left-to-delete** — listed as optional in spec; add later if usability calls for it.
- **Undo after delete** — not in spec.
- **Bulk select / multi-edit** — not in spec.

</deferred>
