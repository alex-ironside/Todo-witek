import { useEffect, useState } from 'react';
import type { Todo, TodoRepository } from '../types';

export interface TodosState {
  todos: Todo[];
  loading: boolean;
}

export const useTodos = (repo: TodoRepository | null): TodosState => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repo) {
      setTodos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const off = repo.observe((next) => {
      setTodos(next);
      setLoading(false);
    });
    return off;
  }, [repo]);

  return { todos, loading };
};
