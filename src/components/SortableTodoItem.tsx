import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TodoItem from './TodoItem';
import type { Todo } from '../types';
import { t } from '../i18n';

interface Props {
  todo: Todo;
}

// Wraps TodoItem with a drag handle. Listeners are bound only to the
// handle so buttons and inputs inside the row stay interactive on touch.
export default function SortableTodoItem({ todo }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-row">
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="drag-handle"
        aria-label={t.dragHandle}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="sortable-row__content">
        <TodoItem todo={todo} />
      </div>
    </div>
  );
}
