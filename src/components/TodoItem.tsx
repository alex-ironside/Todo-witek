import { useEffect, useRef, useState } from 'react';
import { useRepo } from '../hooks/RepoContext';
import ReminderEditor from './ReminderEditor';
import type { Todo } from '../types';
import { t } from '../i18n';

interface Props {
  todo: Todo;
}

const CONFIRM_TIMEOUT_MS = 4000;

export default function TodoItem({ todo }: Props) {
  const repo = useRepo();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const startEdit = () => {
    setDraft(todo.title);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(todo.title);
    setEditing(false);
  };

  const save = async () => {
    const next = draft.trim();
    if (next && next !== todo.title) {
      await repo.update(todo.id, { title: next });
    }
    setEditing(false);
  };

  const onDeleteClick = async () => {
    if (!confirming) {
      setConfirming(true);
      confirmTimerRef.current = setTimeout(
        () => setConfirming(false),
        CONFIRM_TIMEOUT_MS
      );
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirming(false);
    await repo.delete(todo.id);
  };

  return (
    <div className={`todo${todo.done ? ' done' : ''}`}>
      <div className="row todo-main-row" style={{ justifyContent: 'space-between' }}>
        <label className="row todo-label">
          <input
            type="checkbox"
            checked={!!todo.done}
            onChange={(e) => repo.toggleDone(todo.id, e.target.checked)}
            aria-label={t.markDone(todo.title)}
            style={{ width: 'auto' }}
          />
          {editing ? (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                else if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
            />
          ) : (
            <span className="title" onDoubleClick={startEdit}>
              {todo.title}
            </span>
          )}
        </label>
        <div className="row todo-actions">
          <button className="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? t.hideReminders : t.showReminders}
          </button>
          {editing ? (
            <>
              <button className="primary" onClick={save}>
                {t.save}
              </button>
              <button className="ghost" onClick={cancelEdit}>
                {t.cancel}
              </button>
            </>
          ) : (
            <button className="ghost" onClick={startEdit}>
              {t.edit}
            </button>
          )}
          <button className="danger" onClick={onDeleteClick}>
            {confirming ? t.deleteConfirm : t.delete}
          </button>
        </div>
      </div>
      {open && <ReminderEditor todo={todo} />}
    </div>
  );
}
