import { useEffect, useState } from 'react';
import type { Todo, TodoRepository } from '../types';

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  error: Error | null;
}

export const useTodos = (repo: TodoRepository | null): TodosState => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!repo) {
      setTodos([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const off = repo.observe(
      (next) => {
        setTodos(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return off;
  }, [repo]);

  return { todos, loading, error };
};
