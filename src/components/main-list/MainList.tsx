import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCategoryRepo, useRepo } from '../../hooks/RepoContext';
import { useTodos } from '../../hooks/useTodos';
import { useCategories } from '../../hooks/useCategories';
import { useSelectedCategory } from '../../hooks/useSelectedCategory';
import { useAccent } from '../../hooks/useAccent';
import { useStorageMode } from '../../hooks/useStorageMode';
import { useLocalTodoTransfer } from '../../hooks/useLocalTodoTransfer';
import { useEdgeSwipeOpen } from '../../hooks/useEdgeSwipeOpen';
import {
  UNCATEGORIZED,
  type Category,
  type TodoCategory,
} from '../../types';
import { resolveTodoCategory } from '../../utils/resolveCategory';
import { t } from '../../i18n';
import AppBar from './AppBar';
import CategoryTabsBar from './CategoryTabsBar';
import AddTodoRow from './AddTodoRow';
import OpenTodoList from './OpenTodoList';
import DoneSection from './DoneSection';
import EmptyState from './EmptyState';
import Drawer from './Drawer';
import ManageCategoriesSheet from './ManageCategoriesSheet';
import MoveCategorySheet from './MoveCategorySheet';
import PopoverMenu, { type PopoverMenuItem } from './PopoverMenu';
import RemindersSheet from './RemindersSheet';
import SettingsSheet from '../settings/SettingsSheet';
import type { PushState } from '../../hooks/usePushNotifications';

interface MainListProps {
  identity?: string;
  // Phase 8: settings is now owned by MainList itself; callers no longer
  // need to wire onOpenSettings (kept optional for backward-compat).
  onOpenSettings?: () => void;
  email?: string | null;
  onSignOut?: () => void;
  push?: PushState | null;
  canInstall?: boolean;
  onInstall?: () => void;
}

const noop = (): void => {};

// The Main List screen: composes AppBar + tabs + add row + open todos
// (or EmptyState) + collapsible Wykonane section + the Drawer + the
// per-row overflow popover + inline edit + 2-step delete confirm.
// All ephemeral UI state (drawer open, menu target + anchor, editing id,
// confirming-delete id) is owned here. Reminder handling is delegated via
// onOpenReminders (Phase 7 wires the actual sheet).
export default function MainList({
  identity = '',
  onOpenSettings,
  email = null,
  onSignOut = noop,
  push = null,
  canInstall = false,
  onInstall = noop,
}: MainListProps) {
  const repo = useRepo();
  const categoryRepo = useCategoryRepo();
  const { todos } = useTodos(repo);
  const { categories, error: categoriesError } = useCategories(categoryRepo);
  const [category, setCategory] = useSelectedCategory();
  const [accent, setAccent] = useAccent();
  const [mode, setMode] = useStorageMode();
  const transfer = useLocalTodoTransfer(repo);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  // Disable while any modal surface is open so close-gestures don't bounce
  // the drawer back open through the same swipe.
  useEdgeSwipeOpen(openDrawer, !drawerOpen && !settingsOpen && !manageOpen);

  const openSettings = () => {
    setSettingsOpen(true);
    onOpenSettings?.();
  };

  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [remindersForId, setRemindersForId] = useState<string | null>(null);
  const [moveForId, setMoveForId] = useState<string | null>(null);
  const confirmTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    },
    []
  );

  // Resolve every todo to a display category up front so filtering,
  // counts, and the "is the uncategorized bucket non-empty?" check all
  // share one source of truth.
  const resolvedTodos = useMemo(
    () =>
      todos.map((td) => ({
        todo: td,
        resolved: resolveTodoCategory(td.category, categories),
      })),
    [todos, categories]
  );

  const hasUncategorized = resolvedTodos.some(
    ({ resolved, todo }) => resolved === UNCATEGORIZED && !todo.done
  );

  // The virtual "Bez kategorii" tab only appears when there's something
  // in it, so users without legacy data don't see an empty extra tab.
  const uncategorizedTab: Category = useMemo(
    () => ({
      id: UNCATEGORIZED,
      ownerId: '__virtual__',
      name: t.tabUncategorized,
      position: Number.POSITIVE_INFINITY,
    }),
    []
  );
  const displayCategories: Category[] = useMemo(
    () => (hasUncategorized ? [...categories, uncategorizedTab] : categories),
    [categories, hasUncategorized, uncategorizedTab]
  );

  // If the persisted selected category no longer exists (e.g. it was
  // deleted on another device, or it's a pre-78b25bd literal id like
  // 'sluzbowe' that no longer matches any Firestore doc), resolve it
  // against the user's real categories by name first; only then fall
  // back to the first available tab.
  useEffect(() => {
    if (displayCategories.length === 0) return;
    if (displayCategories.some((c) => c.id === category)) return;
    const remapped = resolveTodoCategory(category, categories);
    const next =
      remapped !== UNCATEGORIZED && displayCategories.some((c) => c.id === remapped)
        ? remapped
        : displayCategories[0].id;
    setCategory(next);
  }, [displayCategories, categories, category, setCategory]);

  const inCat = resolvedTodos.filter(({ resolved }) => resolved === category);
  const openTodos = inCat.filter(({ todo }) => !todo.done).map((x) => x.todo);
  const doneTodos = inCat.filter(({ todo }) => todo.done).map((x) => x.todo);

  const counts = useMemo(() => {
    const c: Record<TodoCategory, number> = {};
    for (const cat of categories) c[cat.id] = 0;
    c[UNCATEGORIZED] = 0;
    for (const { todo, resolved } of resolvedTodos) {
      if (todo.done) continue;
      c[resolved] = (c[resolved] ?? 0) + 1;
    }
    return c;
  }, [resolvedTodos, categories]);

  const closeMenu = () => {
    setMenuForId(null);
    setMenuAnchorRect(null);
    setConfirmingDeleteId(null);
    if (confirmTimerRef.current) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  };

  const openOverflow = (id: string, rect: DOMRect) => {
    setMenuForId(id);
    setMenuAnchorRect(rect);
    setConfirmingDeleteId(null);
  };

  const handleEdit = () => {
    if (menuForId) setEditingId(menuForId);
    closeMenu();
  };

  const handleReminders = () => {
    if (menuForId) setRemindersForId(menuForId);
    closeMenu();
  };

  const handleMove = () => {
    if (menuForId) setMoveForId(menuForId);
    closeMenu();
  };

  const handleMoveSelect = async (
    todoId: string,
    categoryId: string
  ): Promise<void> => {
    await repo.update(todoId, { category: categoryId });
  };

  const remindersForTodo =
    remindersForId !== null
      ? todos.find((td) => td.id === remindersForId) ?? null
      : null;

  const moveForTodo =
    moveForId !== null ? todos.find((td) => td.id === moveForId) ?? null : null;

  const handleDelete = () => {
    if (!menuForId) return;
    if (confirmingDeleteId === menuForId) {
      const id = menuForId;
      closeMenu();
      void repo.delete(id);
      return;
    }
    setConfirmingDeleteId(menuForId);
    if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = window.setTimeout(() => {
      setConfirmingDeleteId(null);
      confirmTimerRef.current = null;
    }, 2000);
  };

  const handleSaveEdit = (id: string, title: string) => {
    void repo.update(id, { title });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const items: PopoverMenuItem[] = menuForId
    ? [
        { label: t.edit, onClick: handleEdit },
        { label: t.move, onClick: handleMove },
        { label: t.remind, onClick: handleReminders },
        {
          label: confirmingDeleteId === menuForId ? t.deleteConfirm : t.delete,
          danger: true,
          onClick: handleDelete,
        },
      ]
    : [];

  const handleCreateCategory = async (name: string): Promise<void> => {
    if (!categoryRepo) return;
    await categoryRepo.create({ name });
  };

  const handleRenameCategory = async (
    id: string,
    name: string
  ): Promise<void> => {
    if (!categoryRepo) return;
    await categoryRepo.update(id, { name });
  };

  const handleDeleteCategory = async (id: string): Promise<void> => {
    if (!categoryRepo) return;
    if (categories.length <= 1) return;
    // Move affected todos to the virtual "Bez kategorii" bucket rather
    // than silently reassigning them to another real category. The user
    // explicitly picks a new category later via the move action, so
    // their data is never quietly relabelled.
    const orphaned = resolvedTodos
      .filter(({ resolved }) => resolved === id)
      .map((x) => x.todo);
    await Promise.all(
      orphaned.map((todo) =>
        repo.update(todo.id, { category: UNCATEGORIZED })
      )
    );
    await categoryRepo.delete(id);
    if (category === id) {
      setCategory(orphaned.length > 0 ? UNCATEGORIZED : categories[0].id);
    }
  };

  // Promote the categories load error to a banner. Without this, a
  // permission-denied on the /categories collection (e.g. firestore.rules
  // hasn't been deployed) leaves the UI silently empty — no tabs, no
  // explanation, and the manage sheet just says "Brak kategorii", so the
  // user thinks "adding doesn't work" when in fact every read and write
  // is being rejected by the rules.
  const categoriesErrorBanner =
    categoriesError &&
    (categoriesError as { code?: string }).code === 'permission-denied'
      ? t.categoriesPermissionDenied
      : categoriesError
        ? t.categoriesLoadError
        : null;

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <AppBar
        ref={hamburgerRef}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSettings={openSettings}
      />
      {categoriesErrorBanner && (
        <div role="alert" className="banner warn px-4 py-2 bg-danger text-accentInk text-sm">
          {categoriesErrorBanner}
        </div>
      )}
      <CategoryTabsBar
        value={category}
        onChange={setCategory}
        categories={displayCategories}
      />
      <AddTodoRow category={category} />
      {openTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <OpenTodoList
          todos={openTodos}
          onOpenOverflow={openOverflow}
          editingId={editingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
        />
      )}
      <DoneSection
        todos={doneTodos}
        onOpenOverflow={openOverflow}
        editingId={editingId}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        identity={identity}
        selectedCategory={category}
        onSelectCategory={setCategory}
        counts={counts}
        categories={displayCategories}
        onManageCategories={
          categoryRepo ? () => setManageOpen(true) : undefined
        }
        onOpenSettings={openSettings}
        returnFocusRef={hamburgerRef}
      />
      <PopoverMenu
        open={menuForId !== null}
        anchorRect={menuAnchorRect}
        items={items}
        onClose={closeMenu}
      />
      <RemindersSheet
        todo={remindersForTodo}
        onClose={() => setRemindersForId(null)}
      />
      <MoveCategorySheet
        todo={moveForTodo}
        categories={categories}
        onClose={() => setMoveForId(null)}
        onMove={handleMoveSelect}
        onManageCategories={
          categoryRepo
            ? () => {
                setMoveForId(null);
                setManageOpen(true);
              }
            : undefined
        }
      />
      <ManageCategoriesSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        categories={categories}
        onCreate={handleCreateCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={email}
        onSignOut={onSignOut}
        accent={accent}
        onAccentChange={setAccent}
        mode={mode}
        onModeChange={setMode}
        transfer={
          mode === 'firebase'
            ? {
                localCount: transfer.localCount,
                busy: transfer.busy,
                message: transfer.message,
                onTransfer: () => {
                  void transfer.onTransfer();
                },
              }
            : null
        }
        push={push}
        canInstall={canInstall}
        onInstall={onInstall}
      />
    </div>
  );
}
