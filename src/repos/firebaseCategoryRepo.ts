import {
  createCategory,
  updateCategory,
  deleteCategory,
  observeUserCategories,
} from '../firebase/categories';
import type { CategoryRepository } from '../types';

// Adapts the per-user Firebase category functions to the
// CategoryRepository interface. The rest of the app depends on the
// interface, never the concrete backend.
export const createFirebaseCategoryRepo = (
  ownerId: string
): CategoryRepository => ({
  create: (input) => createCategory(ownerId, input),
  update: updateCategory,
  delete: deleteCategory,
  observe: (callback, onError) =>
    observeUserCategories(ownerId, callback, onError),
});
