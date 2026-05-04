import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRepo } from '../../hooks/RepoContext';
import { moveById } from '../../utils/reorder';
import type { Todo } from '../../types';
import TodoRow from './TodoRow';

interface OpenTodoListProps {
  todos: Todo[];
  onOpenOverflow: (todoId: string) => void;
}

// Pure helper kept top-level so unit tests can exercise the reorder
// decision without simulating dnd-kit pointer events in jsdom.
export const computeReorder = (
  ids: string[],
  activeId: string,
  overId: string
): string[] => {
  if (activeId === overId) return ids;
  const next = moveById(ids, activeId, overId);
  return next;
};

export default function OpenTodoList({ todos, onOpenOverflow }: OpenTodoListProps) {
  const repo = useRepo();
  const sensors = useSensors(
    // 250ms long-press anywhere on the row activates a drag, with a 5px
    // movement tolerance so accidental taps don't start dragging.
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (todos.length === 0) return null;

  const ids = todos.map((t) => t.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const next = computeReorder(ids, String(active.id), String(over.id));
    if (next !== ids) repo.reorder(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-hairlineSoft">
          {todos.map((todo) => (
            <SortableItem key={todo.id} todo={todo} onOpenOverflow={onOpenOverflow} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  todo: Todo;
  onOpenOverflow: (id: string) => void;
}

function SortableItem({ todo, onOpenOverflow }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'bg-bgSheet shadow-[0_8px_24px_oklch(0_0_0/0.35)] scale-[1.02]' : ''}
    >
      <TodoRow todo={todo} onOpenOverflow={onOpenOverflow} />
    </li>
  );
}
