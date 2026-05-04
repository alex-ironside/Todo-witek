import { useState } from 'react';
import type { Todo } from '../../types';
import { t } from '../../i18n';
import TodoRow from './TodoRow';

interface DoneSectionProps {
  todos: Todo[];
  onOpenOverflow: (todoId: string) => void;
}

// Collapsed-by-default "Wykonane (n)" section. Uses CSS grid-template-rows
// 0fr→1fr trick for a smooth height transition with no max-height hack.
export default function DoneSection({ todos, onOpenOverflow }: DoneSectionProps) {
  const [open, setOpen] = useState(false);
  if (todos.length === 0) return null;
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-textDim"
      >
        <span>{t.done} ({todos.length})</span>
        <span
          data-testid="done-chevron"
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div
        data-testid="done-body"
        data-open={open}
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <ul className="divide-y divide-hairlineSoft">
            {todos.map((todo) => (
              <li key={todo.id}>
                <TodoRow todo={todo} onOpenOverflow={onOpenOverflow} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
