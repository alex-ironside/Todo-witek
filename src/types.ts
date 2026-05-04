// Domain types shared across the app. Keep these provider-agnostic so the
// Firebase layer can change without rippling through components.

export interface Reminder {
  id: string;
  remindAt: number; // ms epoch
  fired: boolean;
}

export type TodoCategory = 'prywatne' | 'sluzbowe';

export const TODO_CATEGORIES: readonly TodoCategory[] = ['prywatne', 'sluzbowe'];
export const DEFAULT_CATEGORY: TodoCategory = 'prywatne';

export interface Todo {
  id: string;
  ownerId: string;
  title: string;
  done: boolean;
  reminders: Reminder[];
  // Lower position = appears earlier in the list. Optional for legacy
  // todos created before reordering existed.
  position?: number;
  // Optional for legacy todos created before categories existed; treat
  // missing values as DEFAULT_CATEGORY when filtering.
  category?: TodoCategory;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewTodo = Pick<Todo, 'title'> & {
  reminders?: Reminder[];
  category?: TodoCategory;
};

export type TodoUpdate = Partial<{
  title: string;
  done: boolean;
  reminders: Reminder[];
  position: number;
  category: TodoCategory;
}>;

export type Unsubscribe = () => void;

// Repository abstraction. The app talks to this — never Firebase or
// localStorage directly — so swapping backends is a one-line change.
export interface TodoRepository {
  create: (input: NewTodo) => Promise<string>;
  update: (id: string, fields: TodoUpdate) => Promise<void>;
  toggleDone: (id: string, done: boolean) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  observe: (
    callback: (todos: Todo[]) => void,
    onError?: (err: Error) => void
  ) => Unsubscribe;
}
