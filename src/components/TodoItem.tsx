import { useState } from 'react';
import { toggleDone, updateTodo, deleteTodo } from '../firebase/todos';
import ReminderEditor from './ReminderEditor';
import type { Todo } from '../types';

interface Props {
  todo: Todo;
}

export default function TodoItem({ todo }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (draft.trim() && draft !== todo.title) {
      await updateTodo(todo.id, { title: draft.trim() });
    }
    setEditing(false);
  };

  return (
    <div className={`todo${todo.done ? ' done' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <label className="row" style={{ flex: 1 }}>
          <input
            type="checkbox"
            checked={!!todo.done}
            onChange={(e) => toggleDone(todo.id, e.target.checked)}
            aria-label={`Mark "${todo.title}" as done`}
            style={{ width: 'auto' }}
          />
          {editing ? (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoFocus
            />
          ) : (
            <span className="title" onDoubleClick={() => setEditing(true)}>
              {todo.title}
            </span>
          )}
        </label>
        <div className="row">
          <button className="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Reminders'}
          </button>
          <button className="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button className="danger" onClick={() => deleteTodo(todo.id)}>
            Delete
          </button>
        </div>
      </div>
      {open && <ReminderEditor todo={todo} />}
    </div>
  );
}
