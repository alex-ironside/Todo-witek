import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CATEGORY, type TodoCategory } from '../types';

export const SELECTED_CATEGORY_KEY = 'todo-witek:selected-category';

const read = (): TodoCategory => {
  try {
    const raw = localStorage.getItem(SELECTED_CATEGORY_KEY);
    return typeof raw === 'string' && raw.length > 0 ? raw : DEFAULT_CATEGORY;
  } catch {
    return DEFAULT_CATEGORY;
  }
};

export function useSelectedCategory(): [
  TodoCategory,
  (next: TodoCategory) => void,
] {
  const [category, setCategoryState] = useState<TodoCategory>(read);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_CATEGORY_KEY, category);
    } catch {
      // localStorage unavailable (private mode quota etc.) — keep in-memory only.
    }
  }, [category]);

  const setCategory = useCallback((next: TodoCategory) => {
    setCategoryState(next);
  }, []);

  return [category, setCategory];
}
