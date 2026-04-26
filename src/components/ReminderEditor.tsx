import { useState, type FormEvent } from 'react';
import { updateTodo } from '../firebase/todos';
import { formatRemindAt } from '../utils/dateUtils';
import type { Todo, Reminder } from '../types';

interface Props {
  todo: Todo;
}

const newReminderId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function ReminderEditor({ todo }: Props) {
  const [when, setWhen] = useState('');
  const reminders: Reminder[] = todo.reminders || [];

  const addReminder = async (e: FormEvent) => {
    e.preventDefault();
    if (!when) return;
    const ts = new Date(when).getTime();
    if (Number.isNaN(ts)) return;
    const next: Reminder[] = [
      ...reminders,
      { id: newReminderId(), remindAt: ts, fired: false },
    ];
    setWhen('');
    await updateTodo(todo.id, { reminders: next });
  };

  const removeReminder = async (id: string) => {
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
