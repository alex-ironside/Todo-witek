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

export type Unsubscribe = () => void;
