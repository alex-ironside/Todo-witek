import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRepo } from '../hooks/RepoContext';
import { TODO_CATEGORIES, type TodoCategory } from '../types';
import { t } from '../i18n';

interface Props {
  defaultCategory: TodoCategory;
}

const labelFor = (cat: TodoCategory): string =>
  cat === 'prywatne' ? t.tabPrywatne : t.tabSluzbowe;

export default function TodoForm({ defaultCategory }: Props) {
  const repo = useRepo();
  const [title, setTitle] = useState('');
  const [keepInput, setKeepInput] = useState(false);
  const [category, setCategory] = useState<TodoCategory>(defaultCategory);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the per-add toggle to the active tab whenever the active tab
  // changes — the next add should default to the tab the user is on.
  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const saved = title.trim();
    const savedCategory = category;
    setError('');
    if (!keepInput) setTitle('');
    setCategory(defaultCategory);
    inputRef.current?.focus();
    try {
      await repo.create({
        title: saved,
        reminders: [],
        category: savedCategory,
      });
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
      <div className="row" role="radiogroup" aria-label={t.categoryGroupLabel}>
        {TODO_CATEGORIES.map((cat) => {
          const selected = cat === category;
          return (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? 'primary' : 'ghost'}
              onClick={() => setCategory(cat)}
            >
              {labelFor(cat)}
            </button>
          );
        })}
      </div>
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
