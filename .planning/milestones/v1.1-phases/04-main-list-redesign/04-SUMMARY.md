# Phase 4 — Main List Redesign: Summary

**Completed:** 2026-05-04
**Status:** Implementation complete; visual polish + animation timings flagged human_needed.

## What shipped

- **Main List screen** under `src/components/main-list/`:
  - `AppBar.tsx` — hamburger | brand "Todo" | settings cog with hairline-bottom divider, 44pt hit targets, inline SVG glyphs.
  - `CategoryTabsBar.tsx` — Prywatne / Służbowe segmented tabs with absolutely-positioned 2px accent underline animating `transform`+`width` over 180ms ease-in-out (motion-reduce aware).
  - `AddTodoRow.tsx` — full-width input "Co dziś robisz?" + accent `Dodaj` button. Enter or click submits; input clears and retains focus. Empty submissions are no-ops and the button is disabled. Drops the legacy `keepInputToggle` and in-form category radio.
  - `TodoRow.tsx` — round 22px checkbox (`role=checkbox` button) + title + ••• overflow trigger. Reminder badge below title when `reminders.length > 0`. Done titles get strikethrough + `text-textDim` with a 200ms ease-out color transition.
  - `OpenTodoList.tsx` — `DndContext` + `SortableContext`. PointerSensor / TouchSensor activation `{ delay: 250ms, tolerance: 5px }` so long-press anywhere on the row drags. Hairline dividers via `divide-y divide-hairlineSoft`. Pure `computeReorder(ids, activeId, overId)` helper extracted for jsdom-friendly unit tests.
  - `DoneSection.tsx` — collapsed-by-default "Wykonane (n)" header with chevron rotating 180° on open. Body uses CSS `grid-template-rows: 0fr → 1fr` for smooth height transition (220ms). Hidden entirely when no done todos exist.
  - `EmptyState.tsx` — quiet centered "Brak zadań." (textDim) + "Dodaj pierwsze powyżej." (textMute).
  - `ReminderBadge.tsx` — bell + relative time using `Intl.RelativeTimeFormat('pl')`. Shows the soonest unfired reminder. Returns `null` if no upcoming reminders.
  - `MainList.tsx` — composer. Filters todos by active category, splits open vs done, shows EmptyState when no open todos (independent of done count per CONTEXT decision). Accepts `onOpenDrawer`/`onOpenSettings`/`onOpenOverflow` props with no-op defaults so Phases 5/6/8 can wire later.
- **`src/utils/relativeTime.ts`** — pure Polish-localized formatter using `Intl.RelativeTimeFormat`. Bucket cascade: seconds → minutes → hours → days → months → years. Tested against frozen `now`.
- **`src/hooks/useNow.ts`** — 30-second tick hook returning `Date.now()`; cleans up on unmount.
- **`src/App.tsx` Shell refactored** — renders `<MainList />` directly. Header/footer kept for the temporary InstallButton + StorageModeToggle + sign-out + push controls (Phase 8 absorbs these).
- **Legacy components deleted**: `CategoryTabs.tsx`, `TodoForm.tsx` (+ test), `TodoList.tsx`, `TodoItem.tsx` (+ test), `SortableTodoItem.tsx`. Stale i18n keys (`keepInputToggle`, `todosEmpty`) removed.
- **i18n updates**: `brand` → `'Todo'`, `todoPlaceholder` → `'Co dziś robisz?'`, added `menuOpen`, `settingsOpen`, `empty`, `emptyHint`, `done`, `moreActions`.
- **App.test.tsx** updated to mock `MainList` instead of the removed `TodoForm`/`TodoList`. The push-disable-before-logout regression is preserved.

## Test coverage

| Suite | Tests |
|---|---|
| `utils/relativeTime.test.ts` | 6 |
| `hooks/useNow.test.tsx` | 3 |
| `components/main-list/AppBar.test.tsx` | 4 |
| `components/main-list/CategoryTabsBar.test.tsx` | 5 |
| `components/main-list/AddTodoRow.test.tsx` | 6 |
| `components/main-list/ReminderBadge.test.tsx` | 4 |
| `components/main-list/TodoRow.test.tsx` | 7 |
| `components/main-list/OpenTodoList.test.tsx` | 5 |
| `components/main-list/DoneSection.test.tsx` | 5 |
| `components/main-list/EmptyState.test.tsx` | 2 |
| `components/main-list/MainList.test.tsx` | 8 |
| **Phase total (new)** | **55** |
| Less: legacy tests removed (TodoForm, TodoItem) | -20 |
| **Net delta** | **+35** |

Full suite: **217 passed** (was 182 before Phase 4). Typecheck clean. Build clean.

## Requirements satisfied

- **LIST-01** ✅ — `AppBar` renders hamburger + brand + cog with hairline-bottom divider and 44pt buttons.
- **LIST-02** ✅ — `CategoryTabsBar` renders both tabs with `aria-selected`; underline animates 180ms.
- **LIST-03** ✅ — `AddTodoRow` matches placeholder, button label, focus-retention, and empty-guard behavior.
- **LIST-04** ✅ — `TodoRow` renders round checkbox, title, ••• trigger; `ReminderBadge` shows bell + Polish relative time below title when reminders exist.
- **LIST-05** ✅ — `DoneSection` collapsed by default; "Wykonane (n)" header with chevron; expand reveals strikethrough rows.
- **LIST-06** ✅ — `EmptyState` shows both Polish strings centered when no open todos exist.

## Known gaps for downstream phases

- **Drawer wiring** (Phase 5) — `onOpenDrawer` defaults to no-op.
- **Overflow menu, inline edit, two-step delete** (Phase 6) — `onOpenOverflow` defaults to no-op; `TodoRow` only emits the id.
- **Reminders sheet** (Phase 7) — only existing reminders are rendered via `ReminderBadge`.
- **Settings screen** (Phase 8) — `onOpenSettings` defaults to no-op; `Wyloguj`/`StorageModeToggle`/`InstallButton`/`PushToggle` still live in the temporary footer strip in `App.tsx` until Phase 8 absorbs them.
- **Animation timings** (180ms underline, 160ms add-row enter, 200ms toggle-done, 220ms done-section, 220ms FLIP reorder) cannot be visually verified in jsdom; only their CSS class/style presence is asserted.
- **View-transitions API** for the done-move (mentioned in CONTEXT) was intentionally skipped — plain CSS `transition-colors` on the title satisfies the spec. Future enhancement.
- **Add-row enter animation** (160ms) is not implemented yet — relying on the natural flex layout. Adding `[data-enter] { animation: enterRow 160ms ease-out }` keyframes in `src/index.css` is a one-line follow-up if the visual review wants it.

## Files added

- `src/utils/relativeTime.ts` + `.test.ts`
- `src/hooks/useNow.ts` + `.test.tsx`
- `src/components/main-list/AppBar.tsx` + `.test.tsx`
- `src/components/main-list/CategoryTabsBar.tsx` + `.test.tsx`
- `src/components/main-list/AddTodoRow.tsx` + `.test.tsx`
- `src/components/main-list/ReminderBadge.tsx` + `.test.tsx`
- `src/components/main-list/TodoRow.tsx` + `.test.tsx`
- `src/components/main-list/OpenTodoList.tsx` + `.test.tsx`
- `src/components/main-list/DoneSection.tsx` + `.test.tsx`
- `src/components/main-list/EmptyState.tsx` + `.test.tsx`
- `src/components/main-list/MainList.tsx` + `.test.tsx`
- `src/i18n.ts` (modified — brand renamed, placeholder rewritten, new keys added, stale keys removed)
- `src/App.tsx` (modified — Shell renders `<MainList />`)
- `src/App.test.tsx` (modified — mocks MainList instead of TodoForm/TodoList)

## Files removed

- `src/components/CategoryTabs.tsx`
- `src/components/TodoForm.tsx` + `.test.tsx`
- `src/components/TodoList.tsx`
- `src/components/TodoItem.tsx` + `.test.tsx`
- `src/components/SortableTodoItem.tsx`
