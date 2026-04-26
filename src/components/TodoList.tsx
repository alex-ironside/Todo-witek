import { useState, type DragEvent } from 'react';
import TodoItem from './TodoItem';
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (loading) return <p className="muted">{t.loading}</p>;
  if (!todos.length) return <p className="muted">{t.todosEmpty}</p>;

  const onDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverId) setDragOverId(id);
  };

  const onDrop = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === id) {
      setDraggedId(null);
      return;
    }
    const ids = todos.map((todo) => todo.id);
    const next = moveById(ids, draggedId, id);
    setDraggedId(null);
    if (next !== ids) repo.reorder(next);
  };

  const onDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div>
      {todos.map((todo) => {
        const classes = ['draggable'];
        if (draggedId === todo.id) classes.push('dragging');
        if (dragOverId === todo.id && draggedId && draggedId !== todo.id) {
          classes.push('drop-target');
        }
        return (
          <div
            key={todo.id}
            className={classes.join(' ')}
            draggable
            onDragStart={onDragStart(todo.id)}
            onDragOver={onDragOver(todo.id)}
            onDrop={onDrop(todo.id)}
            onDragEnd={onDragEnd}
          >
            <TodoItem todo={todo} />
          </div>
        );
      })}
    </div>
  );
}
