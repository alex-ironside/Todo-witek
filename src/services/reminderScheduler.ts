import type { Todo } from '../types';

// Schedules in-app notifications for reminders that are due while the
// app is open. Cross-device / app-closed delivery is handled by the FCM
// service worker (firebase-messaging-sw.js) once a Cloud Function is wired up.
//
// Factory pattern keeps it testable: pass any `notify` and `onFired`.

export interface ReminderEventData {
  todoId: string;
  reminderId: string;
}

export interface ReminderSchedulerDeps {
  notify: (title: string, data: ReminderEventData) => void;
  onFired: (todoId: string, reminderId: string) => void;
  now?: () => number;
}

export interface ReminderScheduler {
  sync: (todos: Todo[]) => void;
  stop: () => void;
}

export const createReminderScheduler = ({
  notify,
  onFired,
  now = Date.now,
}: ReminderSchedulerDeps): ReminderScheduler => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const cancelAll = (): void => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  };

  const fire = (
    todoId: string,
    reminderId: string,
    title: string
  ): void => {
    notify(title, { todoId, reminderId });
    onFired(todoId, reminderId);
  };

  const sync = (todos: Todo[]): void => {
    cancelAll();
    const t = now();
    todos.forEach((todo) => {
      if (todo.done) return;
      (todo.reminders || []).forEach((r) => {
        if (r.fired) return;
        const key = `${todo.id}:${r.id}`;
        const delay = r.remindAt - t;
        if (delay <= 0) {
          fire(todo.id, r.id, todo.title);
        } else {
          timers.set(
            key,
            setTimeout(() => {
              timers.delete(key);
              fire(todo.id, r.id, todo.title);
            }, delay)
          );
        }
      });
    });
  };

  return { sync, stop: cancelAll };
};
