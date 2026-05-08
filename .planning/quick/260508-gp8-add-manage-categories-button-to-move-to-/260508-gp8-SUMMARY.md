---
status: complete
quick_id: 260508-gp8
date: 2026-05-08
---

# Quick Task 260508-gp8 — Summary

**Description:** Add "Zarządzaj kategoriami" footer button to the move-to-category view, wired to the same handler the sidebar uses.

## Outcome

The `MoveCategorySheet` now renders a footer button labeled "Zarządzaj kategoriami" beneath the category list. Clicking it closes the move sheet and opens the existing `ManageCategoriesSheet` instance owned by `MainList` — no duplicate render of the management UI.

## Files changed

- `src/components/main-list/MoveCategorySheet.tsx` — added optional `onManageCategories` prop and footer button.
- `src/components/main-list/MoveCategorySheet.test.tsx` — new tests cover button rendering, callback firing, and absence when prop omitted.
- `src/components/main-list/MainList.tsx` — passes `() => setManageOpen(true)` (the existing sidebar handler) into `MoveCategorySheet`.
- `src/components/main-list/MainList.test.tsx` — integration test exercises move-sheet → manage-sheet seam.

## Commits

- `e482979` — feat(260508-gp8-01): add optional onManageCategories prop and footer button to MoveCategorySheet
- `f5a1c85` — feat(260508-gp8-01): wire MoveCategorySheet's manage button to MainList's existing manage handler
- `4898d65` — chore: merge quick task worktree

## Verification

- `npm test -- --run`: 497/497 passing (4 new tests).
- `npm run typecheck`: clean.
- `npm run build`: succeeds.
- Grep audit: single `ManageCategoriesSheet` render site at `MainList.tsx` — no duplication.
- Playwright MCP browser verification: pending — orchestrator will run.

## Notes

`ManageCategoriesSheet` is rendered once at the `MainList` level; both the sidebar entry and the new footer button toggle the same `manageOpen` state. The sidebar drawer is also closed when the move-sheet button fires, matching existing UX.
