import { useEffect, useState } from 'react';
import { observeUserTodos } from '../firebase/todos';
import type { Todo } from '../types';

export interface TodosState {
  todos: Todo[];
  loading: boolean;
}

export const useTodos = (userId: string | null | undefined): TodosState => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const off = observeUserTodos(userId, (next) => {
      setTodos(next);
      setLoading(false);
    });
    return off;
  }, [userId]);

  return { todos, loading };
};
