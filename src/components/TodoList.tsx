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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableTodoItem from './SortableTodoItem';
import { useRepo } from '../hooks/RepoContext';
import { moveById } from '../utils/reorder';
import type { Todo } from '../types';
import { t } from '../i18n';

interface Props {
  todos: Todo[];
  loading: boolean;
}

export default function TodoList({ todos, loading }: Props) {
  const repo = useRepo();
  const sensors = useSensors(
    // Mouse + pen via PointerSensor; small distance prevents click hijacking.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch via TouchSensor; press-and-hold avoids fighting the page scroll.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (loading) return <p className="muted">{t.loading}</p>;
  if (!todos.length) return <p className="muted">{t.todosEmpty}</p>;

  const ids = todos.map((todo) => todo.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = moveById(ids, String(active.id), String(over.id));
    if (next !== ids) repo.reorder(next);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {todos.map((todo) => (
          <SortableTodoItem key={todo.id} todo={todo} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
