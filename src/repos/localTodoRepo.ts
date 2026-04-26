import type {
  Todo,
  TodoRepository,
  TodoUpdate,
  NewTodo,
  Unsubscribe,
} from '../types';

export const LOCAL_TODOS_KEY = 'todo-witek:todos';
const CHANGE_EVENT = 'todo-witek:todos-changed';

const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const read = (): Todo[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TODOS_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
};

const write = (todos: Todo[]): void => {
  localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(todos));
  // Notify same-tab listeners; storage events only fire cross-tab.
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const createLocalTodoRepo = (): TodoRepository => ({
  create: async ({ title, reminders = [] }: NewTodo): Promise<string> => {
    const id = newId();
    const now = Date.now();
    const todo: Todo = {
      id,
      ownerId: 'local',
      title,
      done: false,
      reminders,
      createdAt: now,
      updatedAt: now,
    };
    write([todo, ...read()]);
    return id;
  },

  update: async (id: string, fields: TodoUpdate): Promise<void> => {
    write(
      read().map((t) =>
        t.id === id ? { ...t, ...fields, updatedAt: Date.now() } : t
      )
    );
  },

  toggleDone: async (id: string, done: boolean): Promise<void> => {
    write(
      read().map((t) =>
        t.id === id ? { ...t, done, updatedAt: Date.now() } : t
      )
    );
  },

  delete: async (id: string): Promise<void> => {
    write(read().filter((t) => t.id !== id));
  },

  observe: (callback: (todos: Todo[]) => void): Unsubscribe => {
    callback(read());
    const onChange = () => callback(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_TODOS_KEY) callback(read());
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  },
});
