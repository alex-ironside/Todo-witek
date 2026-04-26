// Domain types shared across the app. Keep these provider-agnostic so the
// Firebase layer can change without rippling through components.

export interface Reminder {
  id: string;
  remindAt: number; // ms epoch
  fired: boolean;
}

export interface Todo {
  id: string;
  ownerId: string;
  title: string;
  done: boolean;
  reminders: Reminder[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewTodo = Pick<Todo, 'title'> & { reminders?: Reminder[] };

export type TodoUpdate = Partial<{
  title: string;
  done: boolean;
  reminders: Reminder[];
}>;

export type Unsubscribe = () => void;

// Repository abstraction. The app talks to this — never Firebase or
// localStorage directly — so swapping backends is a one-line change.
export interface TodoRepository {
  create: (input: NewTodo) => Promise<string>;
  update: (id: string, fields: TodoUpdate) => Promise<void>;
  toggleDone: (id: string, done: boolean) => Promise<void>;
  delete: (id: string) => Promise<void>;
  observe: (callback: (todos: Todo[]) => void) => Unsubscribe;
}
