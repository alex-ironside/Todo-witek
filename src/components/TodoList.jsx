import TodoItem from './TodoItem.jsx';

export default function TodoList({ todos, loading }) {
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
