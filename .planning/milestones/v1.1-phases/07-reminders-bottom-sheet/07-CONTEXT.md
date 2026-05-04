# Phase 7: Reminders Bottom Sheet — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive (designs locked; no questions needed)

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — section "3. Reminders sheet (`reminder`)" + Animations table.
- `redesign/design_handoff_todo_witek/app.jsx` — `Sheet` primitive (line 144) + `ReminderSheet` (line 308) — locks copy and structure.
- `.planning/REQUIREMENTS.md` — REM-01..REM-05 binding.
- `src/components/ReminderEditor.tsx` — current implementation; line 29 contains the 15-min snap that must be preserved.
- `src/services/reminderScheduler.ts` — schedules reminder firings; **no changes** here, just preserve its contract (consumes `Reminder[]` with `remindAt` already snapped).
- `.planning/phases/06-overflow-edit-delete/06-CONTEXT.md` — `MainList` provides `onOpenReminders(todoId)` handler; this phase wires it.

</canonical_refs>

<domain>

## Phase Boundary

Replace `src/components/ReminderEditor.tsx` with a bottom sheet UI matching spec. Preserve 15-min snap behavior and existing scheduler contract. Wires `MainList`'s `onOpenReminders(todoId)` placeholder from Phase 6.

**In scope:**
- `src/components/main-list/Sheet.tsx` — generic bottom-sheet primitive (drag handle, scrim, slide-up animation, drag-down to dismiss). Reused by Phase 8 (Settings).
- `src/components/main-list/RemindersSheet.tsx` — wraps Sheet with the spec'd content (title, todo subtitle, reminder list, Dodaj termin / Anuluj).
- `src/components/main-list/ReminderListItem.tsx` — bell + formatted datetime + `wysłane` pill if fired + trailing ×.
- `src/utils/snapToFifteen.ts` — extract the snap logic from ReminderEditor (pure, fully unit-tested).
- `src/utils/formatReminderTime.ts` — date-time formatter for the list (Polish locale, e.g. "śr., 5 maj 14:30").
- `src/hooks/useDragToDismiss.ts` — generic pointer-event downward-drag-to-close (mirrors `useSwipeClose` from Phase 5 but vertical).
- `MainList.tsx` updated: owns `remindersForId: string | null`, renders `<RemindersSheet>`.
- i18n additions: `reminderSheetTitle: 'Przypomnienia'`, `reminderEmpty: 'Bez przypomnień.'`, `reminderAdd: 'Dodaj termin'`, `reminderSent: 'wysłane'`, `cancel: 'Anuluj'` (already used by Phase 6).

**Delete:** `src/components/ReminderEditor.tsx` and its test once `RemindersSheet` consumes the same logic.

**Out of scope:**
- Cloud Function for scheduled FCM (already in Phase 2).
- Reminder rescheduling UX (spec doesn't include).
- Recurring reminders (not in spec).

</domain>

<decisions>

## Implementation Decisions

### Bottom-sheet primitive — generic, reusable

`<Sheet open onClose title>{children}</Sheet>` renders:

- `position: fixed; inset-x-0; bottom-0; max-h-[85vh]; bg-bgSheet; rounded-t-sheet; shadow-sheet; z-50`
- Slide animation: `translate-y-full → translate-y-0` over 220ms ease-out (CSS transition).
- Backdrop fades 0→1 over 220ms (separate scrim element at `z-40`, click closes).
- Drag handle: 40×4px pill at the top, `bg-hairline`, 12px above content.
- `aria-modal="true"`, `role="dialog"`, focus trap on open, Esc closes.
- Always mounted, animates via transform when `open` toggles (same pattern as Drawer).
- `motion-reduce:duration-0`.

### Drag-to-dismiss — vertical pointer hook

`useDragToDismiss(panelRef, onClose, enabled)` mirrors Phase 5's `useSwipeClose`:

- Pointerdown on the drag handle area (top 32px of sheet).
- Track `dragY = currentY - startY`, clamp to `>= 0`, apply via `style.transform = translateY(${dragY}px)`.
- Release: `dragY > 80px` OR `velocity > 0.4 px/ms` → `onClose()`. Else spring back.
- Ignore drags originating on form controls (input, button) inside the sheet.

### Reminder list — formatted, with `wysłane` badge

```tsx
<ReminderListItem reminder={r}>
  <BellIcon className="w-4 h-4 text-accent" />
  <span className="text-text">{formatReminderTime(r.remindAt)}</span>
  {r.fired && <span className="ml-2 text-xs text-textDim border border-hairline rounded-full px-2">wysłane</span>}
  <button onClick={() => onRemove(r.id)} className="ml-auto text-textMute hover:text-text" aria-label="Usuń">×</button>
</ReminderListItem>
```

Removability follows existing pattern (also remove fired ones — current code permits this, so we keep parity per spec's "follow the codebase's existing pattern").

Empty state: centered "Bez przypomnień." in `text-textDim`.

### Add reminder — native datetime-local picker

```tsx
<button className="w-full bg-accent text-accentInk rounded-field py-3" onClick={() => inputRef.current?.showPicker?.()}>
  Dodaj termin
</button>
<input ref={inputRef} type="datetime-local" className="sr-only" onChange={handleAdd} />
```

`HTMLInputElement.showPicker()` opens the OS-native picker on Chrome/Safari/Edge mobile and desktop. Fallback: if `showPicker` unavailable, the input becomes visible (and focusable). The visually hidden default keeps the spec-clean look.

`handleAdd`:
1. Parse `event.target.value` → `Date` → `getTime()`.
2. Call `snapToFifteen(ts)`.
3. `repo.update(todo.id, { reminders: [...existing, { id: newReminderId(), remindAt: snapped, fired: false }] })`.
4. Reset input value to '' so the same time can be picked again.

### Snap util — extracted, unit-tested

`src/utils/snapToFifteen.ts`:

```ts
const FIFTEEN_MIN_MS = 15 * 60 * 1000;
export const snapToFifteen = (ts: number): number =>
  Math.round(ts / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
```

Tests: snap up at boundary (≥7.5min rounds up), snap down (<7.5min rounds down), exact boundary unchanged, negative inputs rounded correctly.

### Time formatter — Polish locale

`src/utils/formatReminderTime.ts`:

```ts
const fmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit',
});
export const formatReminderTime = (ts: number): string => fmt.format(new Date(ts));
```

Output e.g. "śr., 5 maj 14:30". Pure function, frozen-time tests for Polish output.

### Cancel button

Spec has both `Anuluj` button and drag-down dismiss. `Anuluj` is a secondary text button at the bottom of the sheet, beside `Dodaj termin`. Both close via `onClose`.

### Replace, don't deprecate

Delete `src/components/ReminderEditor.tsx` and `ReminderEditor.test.tsx` once `RemindersSheet` covers the same logic. Update any importers in App.tsx (none expected — it's referenced from per-todo edit flows that Phase 6 already replaced).

### TDD

- `snapToFifteen.test.ts` — exhaustive boundary cases.
- `formatReminderTime.test.ts` — Polish locale assertions.
- `useDragToDismiss.test.ts` — synthetic pointer events; threshold + velocity branches.
- `Sheet.test.tsx` — open/close, Esc, scrim click, focus trap, aria attributes.
- `RemindersSheet.test.tsx` — title + subtitle render, list renders with badge for fired, empty state copy, Dodaj termin opens picker (mock `showPicker`), submit snaps and writes through repo, × removes.
- `MainList.test.tsx` (extended) — TodoRow's overflow → Przypomnij opens RemindersSheet for that todo.

</decisions>

<code_context>

## Existing Code Insights

- `ReminderEditor.tsx` has the 15-min snap inline (line 29). Phase 7 extracts to `snapToFifteen.ts` and tests it independently.
- `reminderScheduler.ts` consumes `Reminder[]` from any source; it doesn't care about the UI. No changes needed.
- `repo.update(id, { reminders })` is the only write path — preserved.
- `HTMLInputElement.showPicker()` is supported in Chrome ≥99, Safari ≥16, Firefox ≥101 (2023+). Mobile coverage is 100% in target browsers.
- `Intl.DateTimeFormat('pl-PL')` is available in Node 18+ / jsdom.

</code_context>

<specifics>

## Specific Ideas

- Sheet max height: 85vh. Body scrolls if reminders exceed.
- Drag threshold: 80px or velocity 0.4 px/ms (slightly higher than horizontal swipe for drawer because vertical mis-fires more easily).
- `wysłane` badge: 12px text, hairline border, `rounded-full px-2`.
- Bell icon: inline SVG (no new dep), 16×16, `text-accent`.

</specifics>

<deferred>

## Deferred Ideas

- **Reschedule existing reminder** — spec doesn't include; would need an edit flow on each ReminderListItem.
- **Recurring reminders** — not in spec.
- **Snooze fired reminders** — not in spec.

</deferred>
