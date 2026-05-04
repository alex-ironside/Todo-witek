import { useRepo } from '../../hooks/RepoContext';
import { useTodos } from '../../hooks/useTodos';
import { useSelectedCategory } from '../../hooks/useSelectedCategory';
import { DEFAULT_CATEGORY } from '../../types';
import AppBar from './AppBar';
import CategoryTabsBar from './CategoryTabsBar';
import AddTodoRow from './AddTodoRow';
import OpenTodoList from './OpenTodoList';
import DoneSection from './DoneSection';
import EmptyState from './EmptyState';

interface MainListProps {
  onOpenDrawer?: () => void;
  onOpenSettings?: () => void;
  onOpenOverflow?: (todoId: string) => void;
}

const noop = (): void => {};

// The Main List screen: composes AppBar + tabs + add row + open todos
// (or EmptyState) + collapsible Wykonane section. Hamburger / settings /
// overflow handlers default to no-ops so this component renders standalone
// before Phases 5/6/8 wire them.
export default function MainList({
  onOpenDrawer = noop,
  onOpenSettings = noop,
  onOpenOverflow = noop,
}: MainListProps) {
  const repo = useRepo();
  const { todos } = useTodos(repo);
  const [category, setCategory] = useSelectedCategory();

  const inCat = todos.filter(
    (t) => (t.category ?? DEFAULT_CATEGORY) === category
  );
  const openTodos = inCat.filter((t) => !t.done);
  const doneTodos = inCat.filter((t) => t.done);

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <AppBar onOpenDrawer={onOpenDrawer} onOpenSettings={onOpenSettings} />
      <CategoryTabsBar value={category} onChange={setCategory} />
      <AddTodoRow category={category} />
      {openTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <OpenTodoList todos={openTodos} onOpenOverflow={onOpenOverflow} />
      )}
      <DoneSection todos={doneTodos} onOpenOverflow={onOpenOverflow} />
    </div>
  );
}
