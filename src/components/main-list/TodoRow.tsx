import { useRepo } from '../../hooks/RepoContext';
import type { Todo } from '../../types';
import { t } from '../../i18n';
import ReminderBadge from './ReminderBadge';
import InlineEdit from './InlineEdit';

interface TodoRowProps {
  todo: Todo;
  onOpenOverflow: (todoId: string, anchorRect: DOMRect) => void;
  isEditing?: boolean;
  onSaveEdit?: (id: string, title: string) => void;
  onCancelEdit?: (id: string) => void;
}

// One row of the open or done list. Layout: round checkbox button | title
// (+ optional ReminderBadge below) | overflow trigger. When isEditing is
// true the title block is replaced with InlineEdit and the checkbox /
// overflow trigger are hidden so they don't compete for tap targets with
// the input + Zapisz button.
export default function TodoRow({
  todo,
  onOpenOverflow,
  isEditing = false,
  onSaveEdit,
  onCancelEdit,
}: TodoRowProps) {
  const repo = useRepo();
  const titleClasses = todo.done
    ? 'line-through text-textDim'
    : 'text-text';

  if (isEditing) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <InlineEdit
          initialTitle={todo.title}
          onSave={(title) => onSaveEdit?.(todo.id, title)}
          onCancel={() => onCancelEdit?.(todo.id)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={t.markDone(todo.title)}
        onClick={() => repo.toggleDone(todo.id, !todo.done)}
        className={`mt-0.5 w-[22px] h-[22px] shrink-0 rounded-full grid place-items-center transition-colors duration-200 ease-out motion-reduce:transition-none ${
          todo.done
            ? 'bg-accent text-accentInk'
            : 'border border-hairline bg-transparent text-transparent'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12 10 17 19 8" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-base font-medium transition-colors duration-200 ease-out motion-reduce:transition-none ${titleClasses}`}
        >
          {todo.title}
        </div>
        {todo.reminders.length > 0 && (
          <div className="mt-1">
            <ReminderBadge reminders={todo.reminders} />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={t.moreActions}
        onClick={(e) => onOpenOverflow(todo.id, e.currentTarget.getBoundingClientRect())}
        className="w-11 h-11 -mr-2 grid place-items-center text-textDim shrink-0"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
    </div>
  );
}
