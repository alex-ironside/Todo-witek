---
slug: old-todos-missing-category
status: resolved
trigger: |
  Old todos created before the category feature don't appear in the app.
  Example doc fields: {createdAt, done, ownerId, position, reminders, title, updatedAt} — no `category` field.
  New todos require category ("sluzbowe" or "prywatne").
created: 2026-05-08T08:27:42Z
updated: 2026-05-08T10:44:00Z
---

# Debug: old-todos-missing-category

## Symptoms

- **Expected:** All existing todos (including those created before the category feature) appear in the app.
- **Actual:** Old todos lacking a `category` field, or carrying a legacy literal `category: 'prywatne'/'sluzbowe'` that no longer matches any Firestore Category doc, didn't appear under any tab.

## Root cause

After commit 78b25bd, `createCategory` writes `categories` with auto-ids and ignores deterministic seed ids. So a Firebase user's `/categories` collection contains docs like `{id: 'autoPriv123', name: 'Prywatne'}`, never `{id: 'prywatne'}`. Legacy todos still hold either no `category` field, or the literal id `'prywatne'`/`'sluzbowe'`.

`MainList.effectiveCategory(undefined | 'sluzbowe')` returned the first available category id (the fallback) — so each legacy todo was *displayed* under whichever auto-id happened to be first. The "reset selected category" effect then snapped the active tab to the same fallback. Net effect: legacy `'sluzbowe'` todos quietly merged into the "Prywatne" tab; categoryless todos likewise. Per-user it looked like missing data.

## Fix

Per the user's directive ("map hardcoded categories to existing categories by name; add 'bez kategorii' as fallback; categories should not be cleared until reassigned"):

1. **Resolver `src/utils/resolveCategory.ts`** — pure helper:
   - Real id match → return id.
   - Legacy literal `'prywatne'`/`'sluzbowe'` → match a user category by name (case- and diacritic-insensitive).
   - Otherwise → `UNCATEGORIZED` sentinel (`'__uncategorized__'`).
2. **Virtual "Bez kategorii" tab** in `MainList.tsx` — appended to `displayCategories` only when at least one open todo resolves to UNCATEGORIZED. Tabs and Drawer both render it.
3. **Selected-category recovery** — when persisted localStorage doesn't match any tab, run it through the resolver first (so `'sluzbowe'` lands the user on their "Służbowe" tab automatically).
4. **Category deletion** — `handleDeleteCategory` now writes `category: UNCATEGORIZED` to affected todos rather than silently moving them to another real category. The user explicitly moves them into a real category later via the existing move action.

## Files changed

- `src/types.ts` — added `UNCATEGORIZED` constant + `LEGACY_CATEGORY_NAME_BY_ID` map.
- `src/utils/resolveCategory.ts` — new pure helper.
- `src/utils/resolveCategory.test.ts` — 8 unit tests (all green).
- `src/i18n.ts` — added `tabUncategorized: 'Bez kategorii'`.
- `src/components/main-list/MainList.tsx` — resolver-based filtering, virtual tab, smart reset, deletion-via-sentinel.
- `src/components/main-list/MainList.legacyCategory.test.tsx` — rewritten regression tests to encode the actual fix behavior (categoryless todo on "Bez kategorii" tab; legacy literal resolves by name).
- `src/components/main-list/MainList.test.tsx` — updated delete-category assertion to expect UNCATEGORIZED reassignment.
- `src/components/main-list/MainList.categoryCrud.test.tsx` — same update.

## Verification

- `npm test` → 493/493 passing.
- `npm run typecheck` → clean.
- `npm run build` → green.
