import TodoItem from './TodoItem';
import type { Todo } from '../types';

interface Props {
  todos: Todo[];
  loading: boolean;
}

export default function TodoList({ todos, loading }: Props) {
  if (loading) return <p className="muted">Loading…</p>;
  if (!todos.length) return <p className="muted">No todos yet. Add one above.</p>;
  return (
    <div>
      {todos.map((t) => (
        <TodoItem key={t.id} todo={t} />
      ))}
    </div>
  );
}
