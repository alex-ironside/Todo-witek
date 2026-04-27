import { useRef, useState, type FormEvent } from 'react';
import { useRepo } from '../hooks/RepoContext';
import { t } from '../i18n';

export default function TodoForm() {
  const repo = useRepo();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      await repo.create({ title: title.trim(), reminders: [] });
      setTitle('');
      // Restore focus so the user can type the next task without clicking.
      // Clicking the submit button moves focus to the button; we reclaim it
      // here while the input is still enabled (no disabled attribute used).
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.todoSaveError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card row" onSubmit={onSubmit}>
      <input
        ref={inputRef}
        placeholder={t.todoPlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        // Do not disable the input during submit — disabling blurs the element
        // and focus is not automatically restored when re-enabled, leaving the
        // user unable to type the next task without clicking the field again.
      />
      <button className="primary" type="submit" disabled={busy || !title.trim()}>
        {t.todoAdd}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
