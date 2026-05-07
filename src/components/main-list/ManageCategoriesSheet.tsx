import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { t } from '../../i18n';
import type { Category } from '../../types';
import Sheet from './Sheet';

interface ManageCategoriesSheetProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onCreate: (name: string) => void | Promise<void>;
  onRename: (id: string, name: string) => void | Promise<void>;
  // Caller is responsible for reassigning any todos that referenced the
  // deleted category before the delete actually goes through.
  onDelete: (id: string) => void | Promise<void>;
}

const sameNameExists = (
  cats: Category[],
  name: string,
  ignoreId: string | null
): boolean => {
  const target = name.trim().toLowerCase();
  return cats.some(
    (c) => c.id !== ignoreId && c.name.trim().toLowerCase() === target
  );
};

// Modal sheet for the four CRUD operations on categories: list, create,
// rename, delete. Delete is a two-step confirmation matching the row
// menu pattern, and the very last category cannot be deleted.
export default function ManageCategoriesSheet({
  open,
  onClose,
  categories,
  onCreate,
  onRename,
  onDelete,
}: ManageCategoriesSheetProps) {
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );
  const confirmTimerRef = useRef<number | null>(null);

  // Reset transient state when the sheet closes so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      setNewName('');
      setCreateError(null);
      setEditingId(null);
      setEditingValue('');
      setEditError(null);
      setConfirmingDeleteId(null);
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(
    () => () => {
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
      }
    },
    []
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (sameNameExists(categories, trimmed, null)) {
      setCreateError(t.categoryDuplicateName);
      return;
    }
    setCreateError(null);
    setNewName('');
    await onCreate(trimmed);
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditingValue(cat.name);
    setEditError(null);
    setConfirmingDeleteId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
    setEditError(null);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    if (sameNameExists(categories, trimmed, editingId)) {
      setEditError(t.categoryDuplicateName);
      return;
    }
    const id = editingId;
    cancelEditing();
    await onRename(id, trimmed);
  };

  const handleEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleDelete = async (cat: Category) => {
    if (categories.length <= 1) return;
    if (confirmingDeleteId === cat.id) {
      const id = cat.id;
      setConfirmingDeleteId(null);
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
      await onDelete(id);
      return;
    }
    setConfirmingDeleteId(cat.id);
    if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = window.setTimeout(() => {
      setConfirmingDeleteId(null);
      confirmTimerRef.current = null;
    }, 2000);
  };

  const isLast = categories.length <= 1;

  // Skip rendering the body while the sheet is closed so its
  // Edytuj/Usuń buttons don't clash with the row overflow popover that
  // shares the same Polish labels.
  if (!open) {
    return (
      <Sheet open={open} onClose={onClose} title={t.manageCategoriesTitle}>
        <span aria-hidden="true" />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.manageCategoriesTitle}>
      <form onSubmit={handleCreate} className="flex items-center gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            if (createError) setCreateError(null);
          }}
          placeholder={t.categoryNamePlaceholder}
          aria-label={t.categoryNamePlaceholder}
          className="flex-1 bg-bgRaised text-text placeholder:text-textMute rounded-field px-4 h-11 outline-none"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="bg-accent text-accentInk rounded-field px-4 h-11 font-semibold disabled:opacity-50"
        >
          {t.categoryAdd}
        </button>
      </form>
      {createError && (
        <div role="alert" className="text-danger text-sm mb-3">
          {createError}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-textDim">{t.manageCategoriesEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairlineSoft">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const confirming = confirmingDeleteId === cat.id;
            return (
              <li
                key={cat.id}
                className="flex items-center gap-2 min-h-[48px] py-2"
              >
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => {
                        setEditingValue(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      onKeyDown={handleEditKey}
                      aria-label={t.categoryRename(cat.name)}
                      className="flex-1 bg-bgRaised text-text rounded-field px-3 h-10 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void commitEdit()}
                      className="px-3 h-10 rounded-field bg-accent text-accentInk font-semibold"
                    >
                      {t.save}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 h-10 rounded-field text-textDim"
                    >
                      {t.cancel}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-text text-base">
                      {cat.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditing(cat)}
                      aria-label={t.categoryRename(cat.name)}
                      className="px-3 h-10 rounded-field text-textDim"
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(cat)}
                      disabled={isLast}
                      aria-label={t.categoryDelete(cat.name)}
                      title={isLast ? t.categoryDeleteLast : undefined}
                      className="px-3 h-10 rounded-field text-danger disabled:opacity-50"
                    >
                      {confirming ? t.deleteConfirm : t.delete}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editError && (
        <div role="alert" className="text-danger text-sm mt-2">
          {editError}
        </div>
      )}
      {isLast && categories.length > 0 && (
        <p className="text-textDim text-sm mt-3">{t.categoryDeleteLast}</p>
      )}
    </Sheet>
  );
}
