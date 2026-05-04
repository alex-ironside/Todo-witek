import { useRef, useState, type FormEvent } from 'react';
import { useRepo } from '../../hooks/RepoContext';
import type { TodoCategory } from '../../types';
import { t } from '../../i18n';

interface AddTodoRowProps {
  category: TodoCategory;
}

// Full-width input + primary Dodaj button. Enter or click submits, input
// clears, focus is retained. Empty/whitespace submissions are no-ops.
export default function AddTodoRow({ category }: AddTodoRowProps) {
  const repo = useRepo();
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle('');
    inputRef.current?.focus();
    await repo.create({ title: trimmed, reminders: [], category });
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-3 bg-bg">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.todoPlaceholder}
        className="flex-1 bg-bgRaised text-text placeholder:text-textMute rounded-field px-4 h-11 outline-none"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="bg-accent text-accentInk rounded-field px-4 h-11 font-semibold disabled:opacity-50"
      >
        {t.todoAdd}
      </button>
    </form>
  );
}
