import { useEffect, useMemo, useRef, useState } from 'react';
import { useRepo } from '../../hooks/RepoContext';
import { useTodos } from '../../hooks/useTodos';
import { useSelectedCategory } from '../../hooks/useSelectedCategory';
import { useAccent } from '../../hooks/useAccent';
import { useStorageMode } from '../../hooks/useStorageMode';
import { DEFAULT_CATEGORY, type TodoCategory } from '../../types';
import { t } from '../../i18n';
import AppBar from './AppBar';
import CategoryTabsBar from './CategoryTabsBar';
import AddTodoRow from './AddTodoRow';
import OpenTodoList from './OpenTodoList';
import DoneSection from './DoneSection';
import EmptyState from './EmptyState';
import Drawer from './Drawer';
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
  const { todos } = useTodos(repo);
  const [category, setCategory] = useSelectedCategory();
  const [accent, setAccent] = useAccent();
  const [mode, setMode] = useStorageMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const openSettings = () => {
    setSettingsOpen(true);
    onOpenSettings?.();
  };

  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [remindersForId, setRemindersForId] = useState<string | null>(null);
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

  const remindersForTodo =
    remindersForId !== null
      ? todos.find((td) => td.id === remindersForId) ?? null
      : null;

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
        { label: t.remind, onClick: handleReminders },
        {
          label: confirmingDeleteId === menuForId ? t.deleteConfirm : t.delete,
          danger: true,
          onClick: handleDelete,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <AppBar
        ref={hamburgerRef}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSettings={openSettings}
      />
      <CategoryTabsBar value={category} onChange={setCategory} />
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
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={email}
        onSignOut={onSignOut}
        accent={accent}
        onAccentChange={setAccent}
        mode={mode}
        onModeChange={setMode}
        push={push}
        canInstall={canInstall}
        onInstall={onInstall}
      />
    </div>
  );
}
