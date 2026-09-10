import { apiRequest } from '../services/apiClient';
import type { NewTodo, Todo, TodoRepository, TodoUpdate, Unsubscribe } from '../types';

const POLL_MS = 5000;

const sortByPosition = (todos: Todo[]): Todo[] =>
  todos.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

export const createApiTodoRepo = (): TodoRepository => ({
  create: async (input: NewTodo): Promise<string> => {
    const todo = await apiRequest<Todo>('POST', '/todos', input);
    return todo.id;
  },

  update: (id: string, fields: TodoUpdate): Promise<void> =>
    apiRequest<void>('PATCH', `/todos/${id}`, fields),

  toggleDone: (id: string, done: boolean): Promise<void> =>
    apiRequest<void>('PATCH', `/todos/${id}`, { done }),

  delete: (id: string): Promise<void> => apiRequest<void>('DELETE', `/todos/${id}`),

  reorder: (orderedIds: string[]): Promise<void> =>
    apiRequest<void>('POST', '/todos/reorder', { orderedIds }),

  observe: (
    callback: (todos: Todo[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe => {
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const todos = await apiRequest<Todo[]>('GET', '/todos');
        if (!cancelled) callback(sortByPosition(todos));
      } catch (err) {
        if (!cancelled) onError?.(err as Error);
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  },
});
