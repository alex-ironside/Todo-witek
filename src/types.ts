// Domain types shared across the app. Keep these provider-agnostic so the
// Firebase layer can change without rippling through components.

export interface Reminder {
  id: string;
  remindAt: number; // ms epoch
  fired: boolean;
}

// A todo's category is identified by the id of a Category document the
// user owns. String-typed because users can create their own categories.
export type TodoCategory = string;

// Default seed category id. Existing todos created before category
// management was introduced reference this id.
export const DEFAULT_CATEGORY: TodoCategory = 'prywatne';

// Built-in seed categories created the first time a user opens the app.
// IDs are deterministic so legacy todos saved with category='prywatne'
// or 'sluzbowe' continue to point to a real category.
export const SEED_CATEGORIES: readonly { id: string; name: string }[] = [
  { id: 'prywatne', name: 'Prywatne' },
  { id: 'sluzbowe', name: 'Służbowe' },
];

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

// User-managed category. Owned by the user; rename and delete go
// through the same wrapper as todos so backend swap is one line.
export interface Category {
  id: string;
  ownerId: string;
  name: string;
  position?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// id is optional so we can seed deterministic ids for the built-in
// categories without a separate API; user-driven creation never sets id.
export interface NewCategory {
  name: string;
  id?: string;
}

export type CategoryUpdate = Partial<{
  name: string;
  position: number;
}>;

export interface CategoryRepository {
  create: (input: NewCategory) => Promise<string>;
  update: (id: string, fields: CategoryUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
  observe: (
    callback: (categories: Category[]) => void,
    onError?: (err: Error) => void
  ) => Unsubscribe;
}
