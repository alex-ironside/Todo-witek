import { useState } from 'react';
import { createTodo } from '../firebase/todos.js';

export default function TodoForm({ userId }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      // Offline-safe: Firestore queues this write and resolves on reconnect.
      await createTodo(userId, { title: title.trim(), reminders: [] });
      setTitle('');
    } catch (err) {
      setError(err.message || 'Could not save');
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
