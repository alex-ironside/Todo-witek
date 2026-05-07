import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCategoryRepo, useRepo } from '../../hooks/RepoContext';
import { useTodos } from '../../hooks/useTodos';
import { useCategories } from '../../hooks/useCategories';
import { useSelectedCategory } from '../../hooks/useSelectedCategory';
import { useAccent } from '../../hooks/useAccent';
import { useStorageMode } from '../../hooks/useStorageMode';
import { useLocalTodoTransfer } from '../../hooks/useLocalTodoTransfer';
import { useEdgeSwipeOpen } from '../../hooks/useEdgeSwipeOpen';
import { DEFAULT_CATEGORY, type TodoCategory } from '../../types';
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
  const { categories } = useCategories(categoryRepo);
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

  // If the persisted selected category no longer exists (e.g. it was
  // deleted on another device), fall back to the default seed or to the
  // first available category.
  useEffect(() => {
    if (categories.length === 0) return;
    if (categories.some((c) => c.id === category)) return;
    const fallback =
      categories.find((c) => c.id === DEFAULT_CATEGORY)?.id ??
      categories[0].id;
    setCategory(fallback);
  }, [categories, category, setCategory]);

  // Map a todo's stored category id to one that actually exists in the
  // user's category list. Legacy todos created before user-managed
  // categories existed reference 'prywatne' / 'sluzbowe' literals, and a
  // failed Firestore seed (e.g. shared-doc-id collision before we moved
  // to auto-ids) can also leave todos pointing at categories that were
  // never created. In both cases, surface those todos under the first
  // available category instead of letting them vanish.
  const knownCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );
  const fallbackCategoryId =
    categories.find((c) => c.id === DEFAULT_CATEGORY)?.id ??
    categories[0]?.id;
  const effectiveCategory = (todoCategory: string | undefined): string => {
    if (todoCategory && knownCategoryIds.has(todoCategory)) return todoCategory;
    return fallbackCategoryId ?? DEFAULT_CATEGORY;
  };

  const inCat = todos.filter((t) => effectiveCategory(t.category) === category);
  const openTodos = inCat.filter((t) => !t.done);
  const doneTodos = inCat.filter((t) => t.done);

  const counts = useMemo(() => {
    const c: Record<TodoCategory, number> = {};
    for (const cat of categories) c[cat.id] = 0;
    for (const t of todos) {
      if (t.done) continue;
      const cat = effectiveCategory(t.category);
      c[cat] = (c[cat] ?? 0) + 1;
    }
    return c;
    // effectiveCategory is derived from categories; depending on it
    // directly avoids stale closures while keeping the count stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, categories]);

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
    // Reassign todos that referenced the deleted category to a sensible
    // fallback: the default seed if it survives, otherwise the first
    // remaining category.
    const remaining = categories.filter((c) => c.id !== id);
    const fallback =
      remaining.find((c) => c.id === DEFAULT_CATEGORY)?.id ?? remaining[0].id;
    const orphaned = todos.filter(
      (t) => (t.category ?? DEFAULT_CATEGORY) === id
    );
    await Promise.all(
      orphaned.map((todo) => repo.update(todo.id, { category: fallback }))
    );
    await categoryRepo.delete(id);
    if (category === id) {
      setCategory(fallback);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <AppBar
        ref={hamburgerRef}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSettings={openSettings}
      />
      <CategoryTabsBar
        value={category}
        onChange={setCategory}
        categories={categories}
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
        categories={categories}
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
