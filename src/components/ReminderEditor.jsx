import { useState } from 'react';
import { updateTodo } from '../firebase/todos.js';
import { formatRemindAt } from '../utils/dateUtils.js';

const newReminderId = () =>
  (crypto.randomUUID?.() || Math.random().toString(36).slice(2));

export default function ReminderEditor({ todo }) {
  const [when, setWhen] = useState('');
  const reminders = todo.reminders || [];

  const addReminder = async (e) => {
    e.preventDefault();
    if (!when) return;
    const ts = new Date(when).getTime();
    if (Number.isNaN(ts)) return;
    const next = [
      ...reminders,
      { id: newReminderId(), remindAt: ts, fired: false },
    ];
    setWhen('');
    await updateTodo(todo.id, { reminders: next });
  };

  const removeReminder = async (id) => {
    await updateTodo(todo.id, {
      reminders: reminders.filter((r) => r.id !== id),
    });
  };

  return (
    <div className="col">
      {reminders.length > 0 && (
        <div className="col">
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`reminder${r.fired ? ' fired' : ''}`}
            >
              <span>
                {formatRemindAt(r.remindAt)} {r.fired ? '· fired' : ''}
              </span>
              <button
                className="ghost"
                type="button"
                onClick={() => removeReminder(r.id)}
                aria-label={`Remove reminder ${formatRemindAt(r.remindAt)}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="row" onSubmit={addReminder}>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <button type="submit">Add reminder</button>
      </form>
    </div>
  );
}
