import {
  type Category,
  type CategoryRepository,
  type CategoryUpdate,
  type NewCategory,
  type Unsubscribe,
} from '../types';

export const LOCAL_CATEGORIES_KEY = 'todo-witek:categories';
const CHANGE_EVENT = 'todo-witek:categories-changed';

const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const read = (): Category[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    return raw ? (JSON.parse(raw) as Category[]) : [];
  } catch {
    return [];
  }
};

const write = (cats: Category[]): void => {
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(cats));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

const sortByPosition = (cats: Category[]): Category[] =>
  cats.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    const ca = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const cb = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return ca - cb;
  });

const minPosition = (cats: Category[]): number => {
  let min = 0;
  for (const c of cats) {
    if (typeof c.position === 'number' && c.position < min) min = c.position;
  }
  return min;
};

export const createLocalCategoryRepo = (): CategoryRepository => ({
  create: async ({ name, id }: NewCategory): Promise<string> => {
    const existing = read();
    const finalId = id ?? newId();
    if (existing.some((c) => c.id === finalId)) return finalId;
    const now = Date.now();
    const cat: Category = {
      id: finalId,
      ownerId: 'local',
      name,
      position: minPosition(existing) - 1,
      createdAt: now,
      updatedAt: now,
    };
    write([...existing, cat]);
    return finalId;
  },

  update: async (id: string, fields: CategoryUpdate): Promise<void> => {
    write(
      read().map((c) =>
        c.id === id ? { ...c, ...fields, updatedAt: Date.now() } : c
      )
    );
  },

  delete: async (id: string): Promise<void> => {
    write(read().filter((c) => c.id !== id));
  },

  observe: (callback: (cats: Category[]) => void): Unsubscribe => {
    callback(sortByPosition(read()));
    const onChange = () => callback(sortByPosition(read()));
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_CATEGORIES_KEY) callback(sortByPosition(read()));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  },
});
