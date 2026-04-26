import { useState, type FormEvent } from 'react';
import { useRepo } from '../hooks/RepoContext';

export default function TodoForm() {
  const repo = useRepo();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      await repo.create({ title: title.trim(), reminders: [] });
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card row" onSubmit={onSubmit}>
      <input
        placeholder="Add a todo…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
      />
      <button className="primary" type="submit" disabled={busy || !title.trim()}>
        Add
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
