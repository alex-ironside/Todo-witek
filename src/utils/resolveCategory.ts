import {
  LEGACY_CATEGORY_NAME_BY_ID,
  UNCATEGORIZED,
  type Category,
  type TodoCategory,
} from '../types';

// Strip Polish diacritics so "Służbowe" and "sluzbowe" compare equal.
const normalizeName = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Resolve the category a todo should be displayed under.
//
// The Firestore /categories collection moved from deterministic seed ids
// ('prywatne'/'sluzbowe') to auto-generated ids in commit 78b25bd. Three
// kinds of todos must keep working:
//
//   1. Modern todos whose `category` is a real auto-id → return as-is.
//   2. Legacy todos whose `category` is a literal seed id ('prywatne'
//      or 'sluzbowe') → look up the user's category by name and remap.
//   3. Todos with no `category` field, or pointing at a deleted/unknown
//      id, or carrying the explicit UNCATEGORIZED sentinel → bucket into
//      the virtual "Bez kategorii" tab so the data is never silently
//      hidden.
export function resolveTodoCategory(
  todoCategory: TodoCategory | undefined,
  categories: readonly Category[]
): TodoCategory {
  if (!todoCategory) return UNCATEGORIZED;
  if (todoCategory === UNCATEGORIZED) return UNCATEGORIZED;

  if (categories.some((c) => c.id === todoCategory)) return todoCategory;

  const legacyName = LEGACY_CATEGORY_NAME_BY_ID[todoCategory.toLowerCase()];
  if (legacyName) {
    const target = normalizeName(legacyName);
    const match = categories.find((c) => normalizeName(c.name) === target);
    if (match) return match.id;
  }

  return UNCATEGORIZED;
}
