import { useEffect, useState } from 'react';
import { observeUserTodos } from '../firebase/todos.js';

export const useTodos = (userId) => {
  const [todos, setTodos] = useState([]);
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
