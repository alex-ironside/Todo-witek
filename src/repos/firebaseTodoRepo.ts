import {
  createTodo,
  updateTodo,
  toggleDone,
  deleteTodo,
  reorderTodos,
  observeUserTodos,
} from '../firebase/todos';
import type { TodoRepository } from '../types';

// Adapts the per-user Firebase todo functions to the TodoRepository
// interface. The rest of the app depends on the interface, not the
// concrete backend.
export const createFirebaseTodoRepo = (ownerId: string): TodoRepository => ({
  create: (input) => createTodo(ownerId, input),
  update: updateTodo,
  toggleDone,
  delete: deleteTodo,
  reorder: reorderTodos,
  observe: (callback, onError) => observeUserTodos(ownerId, callback, onError),
});
