# Phase 4: Main List Redesign — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — locked hifi spec. **MUST read before planning.** Sections "1. Main list (`main`)" and "Interactions & Behavior" are this phase's source of truth.
- `redesign/design_handoff_todo_witek/app.jsx` — reference React-in-browser prototype showing intended structure. NOT production code; reference only.
- `.planning/REQUIREMENTS.md` — LIST-01 through LIST-06 are binding.
- `.planning/phases/03-theme-tokens-accent-system/03-CONTEXT.md` — Tailwind v4 + token utility names this phase consumes (`bg-bg`, `bg-bgRaised`, `text-text`, `text-textDim`, `border-hairlineSoft`, `bg-accent`, `text-accentInk`, `rounded-field`).
- `CLAUDE.md` — strict TS, .tsx only, TDD, Vitest+RTL, no state libraries.
- `src/i18n.ts` — current Polish string table; will be extended.
- `src/types.ts` — `Todo`, `Reminder` shapes; `Todo.order` is the existing reorder field.
- `src/components/SortableTodoItem.tsx` + `src/components/TodoList.tsx` + `src/components/TodoForm.tsx` + `src/components/CategoryTabs.tsx` + `src/components/TodoItem.tsx` — current implementations being replaced.
- `src/App.tsx` — `Shell` component is the current composer; will be refactored to compose `<MainList>`.

</canonical_refs>

<domain>

## Phase Boundary

Recreate the Main List screen — app bar, category tabs, add row, open todo rows, Wykonane (Done) collapse, empty state — pixel-correct to the locked hifi spec, using the Phase 3 tokens. Wires to existing `useTodos` and `useSelectedCategory`. The `• • •` button renders but its menu (Edytuj/Przypomnij/Usuń) is **Phase 6**. Hamburger and cog buttons render but their handlers (drawer open / settings nav) are **Phases 5 and 8**.

**In scope:**
- New components under `src/components/main-list/`: `AppBar.tsx`, `CategoryTabsBar.tsx`, `AddTodoRow.tsx`, `TodoRow.tsx`, `OpenTodoList.tsx`, `DoneSection.tsx`, `EmptyState.tsx`, `ReminderBadge.tsx`, `MainList.tsx` (composer).
- Polish-localized `Intl.RelativeTimeFormat` formatter for reminder time (`src/utils/relativeTime.ts`).
- A 30-second tick hook (`src/hooks/useNow.ts`) so relative-time labels stay fresh.
- All Tailwind v4 utility-based styling — no new CSS files, no inline styles.
- Drag-to-reorder preserved via dnd-kit with **long-press activation** (no visible handle).
- App.tsx `Shell` refactored to render `<MainList>` and pass cross-phase callbacks (`onOpenDrawer`, `onOpenSettings`) as props with no-op defaults.
- Replace `src/components/CategoryTabs.tsx`, `TodoForm.tsx`, `TodoList.tsx`, `TodoItem.tsx`, `SortableTodoItem.tsx` with the new components or delete after callers migrate.
- i18n additions: `Co dziś robisz?`, `Brak zadań.`, `Dodaj pierwsze powyżej.`, `Wykonane`.

**Out of scope:**
- Drawer (Phase 5) — hamburger button is wired but `onOpenDrawer` defaults to no-op.
- Overflow menu contents + inline edit + 2-step delete (Phase 6) — `• • •` button renders and emits `onOpenOverflow(todoId)` with no-op default.
- Reminders sheet (Phase 7) — covered by ReminderBadge displaying existing reminders only.
- Settings screen (Phase 8) — cog button defaults to no-op.
- Auth UI (Phase 9).
- Push toggle UI placement — temporarily kept where it is in App.tsx until Phase 8 absorbs it into Settings.

</domain>

<decisions>

## Implementation Decisions

### Component structure — one file per subcomponent

All under `src/components/main-list/`:

```
main-list/
  MainList.tsx           ← composer (the "screen")
  AppBar.tsx             ← hamburger + brand + cog + hairline
  CategoryTabsBar.tsx    ← Prywatne / Służbowe with animated underline
  AddTodoRow.tsx         ← input + Dodaj button
  OpenTodoList.tsx       ← DndContext wrapper + sortable list of TodoRow
  TodoRow.tsx            ← checkbox + title + ReminderBadge + ••• button
  DoneSection.tsx        ← collapsible "Wykonane (n)" header + done todos
  EmptyState.tsx         ← centered Brak zadań. + Dodaj pierwsze powyżej.
  ReminderBadge.tsx      ← bell icon + relative time, only when todo has reminders
```

Each file co-locates a `*.test.tsx` per CLAUDE.md.

### Drag-to-reorder — long-press activation, no visible handle

- Keep `@dnd-kit/core` + `@dnd-kit/sortable` dependencies.
- Configure `PointerSensor` with `activationConstraint: { delay: 250, tolerance: 5 }` (mouse + touch unified). Same delay for `TouchSensor` for explicit touch.
- Whole row body (excluding checkbox, ReminderBadge area, and `•••` hit-targets) is the drag handle. The checkbox/buttons receive their own pointer events first via DOM order — long-press only fires when the user holds without lifting.
- `setNodeRef` and `attributes` on the row container; no separate grip element.
- Reorder writes through the existing repo `update(todoId, { order })` path (already used by SortableTodoItem) — no schema changes.
- Visual: while dragging, row gets `bg-bgSheet` + `shadow-sheet` (the only shadow allowed) + `scale-[1.02]` via transform. FLIP-style smooth land animation comes free from CSS Grid/flex transitions on the new `transform`.

### Animations — CSS-only

Every motion in the spec is property-based:

| Trigger | Property | Duration | Implementation |
|---|---|---|---|
| Tab underline | transform translateX, width | 180ms ease-in-out | `transition-[transform,width]` on the underline element; underline is one absolutely-positioned `<span>` inside `CategoryTabsBar`. |
| Add todo entry | opacity, translateY 8→0 | 160ms ease-out | New row gets `data-enter` attribute on first render; CSS `[data-enter] { animation: enterRow 160ms ease-out }`. Removed via `requestAnimationFrame`. |
| Toggle done | color, line-through | 200ms ease-out | `transition-colors` + `transition-[text-decoration-color]` on title span. |
| Done section collapse | grid-template-rows 0fr→1fr (modern CSS) | 220ms ease-out | Wrapper uses `grid` with single row of `[data-open] ? 1fr : 0fr`. Content overflow:hidden. Smoother than max-height hacks. |
| FLIP reorder | transform via dnd-kit's CSS.Transform.toString | 220ms | dnd-kit does this; we just enable `transition` on `transform`. |

No new dependencies. No `framer-motion` / `react-spring`.

`prefers-reduced-motion: reduce` → all animations collapse to `duration-0` via `motion-reduce:` Tailwind variant.

### Reminder relative time — Intl.RelativeTimeFormat('pl')

`src/utils/relativeTime.ts`:

```ts
const rtf = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' });

export function formatRelative(target: number, now: number): string {
  const diffSec = Math.round((target - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}
```

Pure function, fully unit-tested with a frozen `now`. Intl handles all Polish plural forms (1 minuta / 2 minuty / 5 minut, "za 5 minut", "5 minut temu", etc.).

`src/hooks/useNow.ts` returns `Date.now()` and re-renders every 30 seconds via `setInterval`. `ReminderBadge` consumes it. Simple, correct, no animation jitter.

### App bar handlers — props with no-op defaults

`<MainList>` accepts:

```ts
interface MainListProps {
  onOpenDrawer?: () => void;     // wired in Phase 5
  onOpenSettings?: () => void;   // wired in Phase 8
  onOpenOverflow?: (todoId: string) => void;  // wired in Phase 6
  onOpenReminders?: (todoId: string) => void; // wired in Phase 7 (placeholder for Phase 6)
}
```

Default each to `() => {}`. Phase 4 verification: clicking the buttons fires the prop callback (assertable in tests). Visual presence covered by RTL queries.

### Done section — local component state, always defaults closed

`DoneSection` owns its own `useState(false)` for open/closed. Spec says "collapsed by default" — no persistence requirement. Re-mount = re-collapse. Header shows `Wykonane (n)` where `n` is the count.

### Empty state condition

`EmptyState` shows iff `visibleTodos.length === 0` for the active category — independent of done count (i.e., if all done, the open list is empty → empty state shows above the Wykonane section). This matches the spec's "Empty state (when no todos in active category)".

Wait — re-reading: spec says "no todos" so if there are done todos, technically not empty. But practically, the open list shows nothing and Wykonane is collapsed below. **Decision:** show EmptyState only when `todos.filter(t => t.category === active && !t.done).length === 0` AND we're not currently editing. Done section stays visible below if any done todos exist. This is the intuitive read of the spec.

### Replace, don't deprecate

Per CLAUDE.md ("no backwards-compat hacks"):
- Delete `src/components/CategoryTabs.tsx`, `TodoForm.tsx`, `TodoList.tsx`, `TodoItem.tsx`, `SortableTodoItem.tsx` and their tests once `MainList` consumes the replacements.
- Update `src/App.tsx` `Shell` to render `<MainList>` directly.
- Existing tests for the old components are deleted; new tests for the new components must cover the same behaviors.

### Toggle-done flow

User taps checkbox → `repo.update(id, { done: true })` is called immediately. The Firestore onSnapshot tick re-renders within ~50ms. The 200ms strikethrough animation runs as the row receives the new `done` prop. Then the row "moves" to the Wykonane section because of how it's filtered in MainList. There's no manual setTimeout — relying on React re-render + CSS transition is enough. The spec's "200ms later moves" is satisfied by the transition duration before the next layout commit.

For the FLIP-style move: wrap open list and done section in a shared parent and use `view-transitions API` if supported, falling back to no transition. Since this is mobile + Chrome/Safari and view-transitions is widely available in 2025, this is the lightest implementation. Behind a `motion-reduce:` guard.

### TDD for this phase

Per file:
- `relativeTime.test.ts` — pure function, time freeze, Polish plural assertions.
- `useNow.test.tsx` — fake timers, asserts re-render on tick.
- `AppBar.test.tsx` — renders 3 buttons; clicking each calls its prop.
- `CategoryTabsBar.test.tsx` — renders both tabs; click switches; underline element moves (assert via `data-active` attr, not pixel position).
- `AddTodoRow.test.tsx` — Enter submits, Dodaj submits, input clears, retains focus. Submitting empty does nothing.
- `TodoRow.test.tsx` — renders title, checkbox toggles, `•••` calls `onOpenOverflow`. ReminderBadge appears iff `todo.reminders.length > 0`.
- `OpenTodoList.test.tsx` — renders rows, drag interaction (use dnd-kit's testing util to simulate keyboard/pointer drag).
- `DoneSection.test.tsx` — collapsed by default; click header expands; renders strikethrough done rows.
- `EmptyState.test.tsx` — renders both Polish strings.
- `ReminderBadge.test.tsx` — shows nearest reminder time; uses `useNow` (mock).
- `MainList.test.tsx` — integration: renders all subcomponents; empty state visibility logic; Wykonane visibility logic; long-press triggers drag (high level).
- Existing App.test.tsx is updated to assert new structure (or trimmed to just smoke-test the shell wiring).

</decisions>

<code_context>

## Existing Code Insights

- `src/components/SortableTodoItem.tsx` shows the dnd-kit pattern already in use — `useSortable` hook, `setNodeRef`, `transform`, `transition`. We swap the explicit `.drag-handle` element for a row-wide `attributes`/`listeners` spread plus the activation delay constraint.
- `src/i18n.ts` is a flat `t` object — extending it is one PR.
- `src/hooks/useTodos.ts` already returns `{ todos, loading, error }`. No changes needed — we just consume.
- `src/repos/firebaseTodoRepo.ts` and `localTodoRepo.ts` both implement `update(id, partial)`. The `order` and `done` fields are already in `Todo`. No repo work needed for Phase 4.
- `src/types.ts` has `Reminder = { id, remindAt: number, fired: boolean }` — exactly what the badge needs.
- The current `CategoryTabs.tsx` uses `i18n` for `Prywatne`/`Służbowe`. Replacement uses same strings, plus Tailwind for the underline.
- `useReminderScheduler` in App.tsx is unrelated to the visual phase — leave alone.
- `vitest` config: `jsdom` is used; `Intl.RelativeTimeFormat('pl')` is supported in Node 18+ and jsdom inherits Node's Intl.

</code_context>

<specifics>

## Specific Ideas

- Long-press activation delay: **250ms with 5px tolerance**. Tunable later.
- Tick interval for `useNow`: **30 seconds**. Fine-grained enough for "X minut temu" labels.
- Animations all respect `prefers-reduced-motion` via Tailwind `motion-reduce:` modifier.
- Tab underline: 2px, full width of active tab label, accent-colored.
- Checkbox: round, 22×22px, hairline border when unchecked, accent fill + accentInk checkmark when checked.
- `•••` button: 44×44px hit target, icon visually 20px, color textDim.
- Hairline divider between rows: `divide-y divide-hairlineSoft` on the OpenTodoList wrapper.
- Empty state vertical position: ~30% from top of available space (Tailwind `mt-32` or flex centering).
- DoneSection chevron rotates 180° when open (CSS transform transition).

</specifics>

<deferred>

## Deferred Ideas

- **Swipe-left to delete** — spec lists it as optional ("Optional: swipe-left on a row reveals a red `Usuń` action"). Not implementing in Phase 4; revisit after Phase 6.
- **FLIP layout transition for tab switch** — spec mentions FLIP for "Tab/section reorder". Tab switch is "instant content swap" per spec, so FLIP applies only to drag-reorder within a list. Already handled by dnd-kit transitions.
- **Persisting Wykonane open/closed state** — not in spec, skipped.
- **Pull-to-refresh** — not in spec.

</deferred>
