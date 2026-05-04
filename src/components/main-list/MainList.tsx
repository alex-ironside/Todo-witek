import { useMemo, useRef, useState } from 'react';
import { useRepo } from '../../hooks/RepoContext';
import { useTodos } from '../../hooks/useTodos';
import { useSelectedCategory } from '../../hooks/useSelectedCategory';
import { DEFAULT_CATEGORY, type TodoCategory } from '../../types';
import AppBar from './AppBar';
import CategoryTabsBar from './CategoryTabsBar';
import AddTodoRow from './AddTodoRow';
import OpenTodoList from './OpenTodoList';
import DoneSection from './DoneSection';
import EmptyState from './EmptyState';
import Drawer from './Drawer';

interface MainListProps {
  identity?: string;
  onOpenSettings?: () => void;
  onOpenOverflow?: (todoId: string) => void;
}

const noop = (): void => {};

// The Main List screen: composes AppBar + tabs + add row + open todos
// (or EmptyState) + collapsible Wykonane section + the Drawer. Owns
// drawerOpen state and computes per-category open-todo counts from the
// shared useTodos consumer (Drawer never calls useTodos itself).
export default function MainList({
  identity = '',
  onOpenSettings = noop,
  onOpenOverflow = noop,
}: MainListProps) {
  const repo = useRepo();
  const { todos } = useTodos(repo);
  const [category, setCategory] = useSelectedCategory();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const inCat = todos.filter(
    (t) => (t.category ?? DEFAULT_CATEGORY) === category
  );
  const openTodos = inCat.filter((t) => !t.done);
  const doneTodos = inCat.filter((t) => t.done);

  const counts = useMemo(() => {
    const c: Record<TodoCategory, number> = { prywatne: 0, sluzbowe: 0 };
    for (const t of todos) {
      if (t.done) continue;
      const cat = t.category ?? DEFAULT_CATEGORY;
      c[cat]++;
    }
    return c;
  }, [todos]);

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <AppBar
        ref={hamburgerRef}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSettings={onOpenSettings}
      />
      <CategoryTabsBar value={category} onChange={setCategory} />
      <AddTodoRow category={category} />
      {openTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <OpenTodoList todos={openTodos} onOpenOverflow={onOpenOverflow} />
      )}
      <DoneSection todos={doneTodos} onOpenOverflow={onOpenOverflow} />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        identity={identity}
        selectedCategory={category}
        onSelectCategory={setCategory}
        counts={counts}
        onOpenSettings={onOpenSettings}
        returnFocusRef={hamburgerRef}
      />
    </div>
  );
}
