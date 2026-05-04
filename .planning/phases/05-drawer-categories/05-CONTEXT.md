# Phase 5: Drawer (Categories) — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — section "2. Drawer — Categories (`drawer`)" + Animations table.
- `.planning/REQUIREMENTS.md` — DRAWER-01..DRAWER-04.
- `.planning/phases/03-theme-tokens-accent-system/03-CONTEXT.md` — token utilities.
- `.planning/phases/04-main-list-redesign/04-CONTEXT.md` — MainList composes the drawer; AppBar's hamburger fires `onOpenDrawer`.
- `src/hooks/useSelectedCategory.ts` — drawer rows call its setter.
- `src/hooks/useAuth.ts` + `src/services/storageMode.ts` — header shows email or `Tryb lokalny`.

</canonical_refs>

<domain>

## Phase Boundary

Slide-in left drawer with scrim for category switching, with header (brand + identity) and footer settings link. Wires the previously no-op hamburger button (Phase 4) and renders the cog row that wires Settings (Phase 8 fills it).

**In scope:**
- `src/components/main-list/Drawer.tsx` — the panel + scrim + transitions.
- `src/components/main-list/CategoryDrawerRow.tsx` — single row with active accent bar + count.
- `src/hooks/useSwipeClose.ts` — pointer-event-based swipe-left detector returning `{ ref, dragX }` for use by Drawer.
- `MainList.tsx` updated: owns `drawerOpen` state, passes `onOpenDrawer={() => setDrawerOpen(true)}` to AppBar, renders `<Drawer open={drawerOpen} onClose={...}>`.
- Counts computed in MainList (filter+count from `useTodos` already there) and passed.
- Footer `Ustawienia` row fires `onOpenSettings` prop (default no-op until Phase 8).

**Out of scope:**
- Settings screen (Phase 8).
- Adding more than two categories (REQUIREMENTS out-of-scope).
- Drawer-from-right or bottom drawer.

</domain>

<decisions>

## Implementation Decisions

### State — local in MainList

`MainList` adds `const [drawerOpen, setDrawerOpen] = useState(false);` Passed into AppBar (`onOpenDrawer={() => setDrawerOpen(true)}`) and Drawer (`open`, `onClose`). No URL involvement, no router.

`Esc` key closes the drawer (effect on document while open).

### Render mode — always mounted, transform offscreen

```tsx
<aside
  className={`fixed inset-y-0 left-0 w-[80%] max-w-[320px] bg-bg shadow-sheet
              transform transition-transform duration-[240ms] ease-out z-50
              ${open ? 'translate-x-0' : '-translate-x-full'}`}
  aria-hidden={!open}
  inert={open ? undefined : ''}
>
```

Scrim:

```tsx
<div
  className={`fixed inset-0 bg-black/50 transition-opacity duration-[240ms] z-40
              ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  onClick={onClose}
/>
```

Both live in DOM at all times. `inert` (modern attribute) prevents focus-trap leakage when closed; falls back to `aria-hidden` for older browsers.

### Swipe-close — pointer events + threshold

`src/hooks/useSwipeClose.ts`:

```ts
export function useSwipeClose(
  panelRef: RefObject<HTMLElement>,
  onClose: () => void,
  enabled: boolean,
): { dragX: number }
```

- Listens to `pointerdown` on panel; tracks `startX`, `startTime`.
- On `pointermove`, computes `dragX = currentX - startX` (clamped to `<= 0`). Applies `translateX(${dragX}px)` via direct style mutation (not React state — perf).
- On `pointerup`: if `dragX < -80px` OR (`dragX < -30px` AND velocity > 0.3 px/ms) → `onClose()`. Otherwise spring back via setting `style.transform = ''` and letting CSS transition do the rest.
- Disabled when `enabled=false` (drawer closed).
- Ignores swipes that originated on interactive children (input/button/a) by checking `event.target.closest('button,input,a')`.

Pure DOM, no deps, ~60 lines, fully unit-testable with synthetic pointer events.

### Counts — props from MainList

```tsx
const counts = useMemo(() => {
  const c = { prywatne: 0, sluzbowe: 0 };
  for (const t of todos) {
    if (t.done) continue;
    c[t.category ?? DEFAULT_CATEGORY]++;
  }
  return c;
}, [todos]);
```

Passed as `<Drawer counts={counts}>`. Drawer passes per-row.

### Header identity

```tsx
<header>
  <div className="text-xl font-semibold">Todo</div>
  <div className="text-textDim text-sm">{identity}</div>
</header>
```

`identity` is already passed through MainList from App.tsx (existing `identity` prop on Shell — moves to MainList). For local mode, `t.identityLocal` (`Tryb lokalny`).

### Active row visual

Active category row: `border-l-[3px] border-accent bg-bgRaised`. Inactive: no border, transparent bg.

### Focus management

When drawer opens: focus moves to first focusable element in the drawer (Prywatne row). When drawer closes: focus returns to the hamburger button. Standard `useEffect` pattern with refs.

### Reduced motion

`motion-reduce:duration-0` on both panel and scrim. Swipe still works (it's a gesture, not a motion preference).

### TDD

- `useSwipeClose.test.ts` — synthetic pointer events; assert `onClose` called past threshold; not called below; ignores when disabled.
- `Drawer.test.tsx` — renders both rows; click row → `onSelectCategory` called + `onClose`; scrim click → `onClose`; ESC key → `onClose`; `open=false` → `aria-hidden`.
- `CategoryDrawerRow.test.tsx` — count rendered; active state class; click handler.
- Integration in `MainList.test.tsx` — clicking AppBar hamburger opens drawer; drawer category click switches `useSelectedCategory` and closes.

</decisions>

<code_context>

## Existing Code Insights

- `useSelectedCategory` already returns `[selectedCategory, setSelectedCategory]` — drawer rows call setter.
- `useAuth.user.email` provides email for Firebase mode; for local mode use `t.identityLocal`.
- `inert` attribute is supported in all modern browsers (2024+).
- `Element.setPointerCapture` is needed during swipe to keep events flowing if user drags off the panel.

</code_context>

<specifics>

## Specific Ideas

- Drawer width: `80% max-w-[320px]` so it never gets too wide on tablets.
- Z-index: scrim 40, drawer 50 (above scrim).
- Swipe threshold: 80px hard, 30px+velocity 0.3 soft.
- Footer `Ustawienia` row: hairline divider above, cog icon (lucide-react if available, else inline SVG — no extra dep).
- Section label `Kategorie` rendered as overline (text-xs uppercase tracking-wide text-textMute).

</specifics>

<deferred>

## Deferred Ideas

- Drawer for narrow desktop: spec is mobile-only; on wide screens drawer still slides in over content.
- Custom categories: out-of-scope per REQUIREMENTS.
- Edge-swipe to open: can add later; spec doesn't require.

</deferred>
