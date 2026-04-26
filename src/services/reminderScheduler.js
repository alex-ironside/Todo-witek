// Schedules in-app notifications for reminders that are due while the
// app is open. Cross-device / app-closed delivery is handled by the FCM
// service worker (firebase-messaging-sw.js) once a Cloud Function is wired up.
//
// Factory pattern keeps it testable: pass any `notify` and `onFired`.

export const createReminderScheduler = ({ notify, onFired, now = Date.now }) => {
  const timers = new Map();

  const cancelAll = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };

  const fire = (todoId, reminderId, title, body) => {
    notify(title, body);
    onFired(todoId, reminderId);
  };

  const sync = (todos) => {
    cancelAll();
    const t = now();
    todos.forEach((todo) => {
      if (todo.done) return;
      (todo.reminders || []).forEach((r) => {
        if (r.fired) return;
        const key = `${todo.id}:${r.id}`;
        const body = { todoId: todo.id, reminderId: r.id };
        const delay = r.remindAt - t;
        if (delay <= 0) {
          fire(todo.id, r.id, todo.title, body);
        } else {
          timers.set(
            key,
            setTimeout(() => {
              timers.delete(key);
              fire(todo.id, r.id, todo.title, body);
            }, delay)
          );
        }
      });
    });
  };

  return { sync, stop: cancelAll };
};
