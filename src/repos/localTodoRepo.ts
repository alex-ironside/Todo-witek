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

const sortByPosition = (todos: Todo[]): Todo[] =>
  todos.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    const ca = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const cb = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return cb - ca;
  });

const minPosition = (todos: Todo[]): number => {
  let min = 0;
  for (const todo of todos) {
    if (typeof todo.position === 'number' && todo.position < min) {
      min = todo.position;
    }
  }
  return min;
};

export const createLocalTodoRepo = (): TodoRepository => ({
  create: async ({ title, reminders = [] }: NewTodo): Promise<string> => {
    const id = newId();
    const now = Date.now();
    const existing = read();
    const todo: Todo = {
      id,
      ownerId: 'local',
      title,
      done: false,
      reminders,
      position: minPosition(existing) - 1,
      createdAt: now,
      updatedAt: now,
    };
    write([todo, ...existing]);
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

  reorder: async (orderedIds: string[]): Promise<void> => {
    const positionById = new Map(orderedIds.map((id, idx) => [id, idx]));
    const now = Date.now();
    write(
      read().map((t) => {
        const pos = positionById.get(t.id);
        return pos === undefined ? t : { ...t, position: pos, updatedAt: now };
      })
    );
  },

  observe: (callback: (todos: Todo[]) => void): Unsubscribe => {
    callback(sortByPosition(read()));
    const onChange = () => callback(sortByPosition(read()));
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_TODOS_KEY) callback(sortByPosition(read()));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  },
});
