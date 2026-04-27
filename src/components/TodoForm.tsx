import { useRef, useState, type FormEvent } from 'react';
import { useRepo } from '../hooks/RepoContext';
import { t } from '../i18n';

export default function TodoForm() {
  const repo = useRepo();
  const [title, setTitle] = useState('');
  const [keepInput, setKeepInput] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const saved = title.trim();
    setError('');
    if (!keepInput) setTitle('');
    inputRef.current?.focus();
    try {
      await repo.create({ title: saved, reminders: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.todoSaveError);
      setTitle(saved);
    }
  };

  return (
    <form className="card col" onSubmit={onSubmit}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={keepInput}
          onChange={(e) => setKeepInput(e.target.checked)}
          style={{ width: 'auto', margin: 0 }}
        />
        {t.keepInputToggle}
      </label>
      <div className="row">
        <input
          ref={inputRef}
          placeholder={t.todoPlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          // Do not disable the input during submit — disabling blurs the element
          // and focus is not automatically restored when re-enabled.
        />
        <button className="primary" type="submit" disabled={!title.trim()}>
          {t.todoAdd}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
