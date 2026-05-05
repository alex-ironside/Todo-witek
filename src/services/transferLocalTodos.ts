import { LOCAL_TODOS_KEY } from '../repos/localTodoRepo';
import {
  DEFAULT_CATEGORY,
  type Reminder,
  type Todo,
  type TodoRepository,
} from '../types';

export interface TransferOptions {
  clearLocalAfter?: boolean;
}

export interface TransferResult {
  transferred: number;
}

const LOCAL_CHANGE_EVENT = 'todo-witek:todos-changed';

const readLocalTodos = (): Todo[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TODOS_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
};

// Copies every todo currently in localStorage to the destination repo,
// preserving title, reminders, category, and done state. The local store
// is only cleared when the caller opts in AND every create succeeded —
// failure leaves the local data untouched so the user can retry.
export const transferLocalTodosTo = async (
  destination: TodoRepository,
  { clearLocalAfter = false }: TransferOptions = {}
): Promise<TransferResult> => {
  const local = readLocalTodos();
  for (const todo of local) {
    const reminders: Reminder[] = todo.reminders ?? [];
    const id = await destination.create({
      title: todo.title,
      reminders,
      category: todo.category ?? DEFAULT_CATEGORY,
    });
    if (todo.done) {
      await destination.toggleDone(id, true);
    }
  }
  if (clearLocalAfter && local.length > 0) {
    localStorage.removeItem(LOCAL_TODOS_KEY);
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT));
  }
  return { transferred: local.length };
};
