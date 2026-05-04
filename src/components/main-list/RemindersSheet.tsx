import { useEffect, useState, type ChangeEvent } from 'react';
import Sheet from './Sheet';
import ReminderListItem from './ReminderListItem';
import { useRepo } from '../../hooks/RepoContext';
import { snapToFifteen } from '../../utils/snapToFifteen';
import { formatReminderTime } from '../../utils/formatReminderTime';
import { t } from '../../i18n';
import type { Todo, Reminder } from '../../types';

interface Props {
  todo: Todo | null;
  onClose: () => void;
}

const newReminderId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

// Bottom-sheet UI for managing one todo's reminders. Owns no business state
// itself — all reads/writes go through the injected repo.
//
// iOS Safari does not implement HTMLInputElement.showPicker() for
// datetime-local, so any JS-driven approach silently no-ops there. Instead we
// overlay a real `<input type="datetime-local">` on top of the visible
// affordance with opacity-0; the user's touch lands directly on the input and
// the OS opens its native picker through standard input activation. Works
// uniformly on iOS Safari, Android Chrome, and desktop browsers.
//
// Picking stages a pending value; the user explicitly confirms via "Dodaj
// termin". Datetime-local inputs fire `change` for every field touched
// (year/month/day/hour/minute) on many platforms, so committing on every
// change would create a reminder per intermediate step.
export default function RemindersSheet({ todo, onClose }: Props) {
  const repo = useRepo();
  const reminders: Reminder[] = todo?.reminders ?? [];
  const [pendingValue, setPendingValue] = useState('');

  // Drop a stale pick when the sheet switches to a different todo (or closes)
  // so a leftover selection from one todo doesn't bleed into another.
  useEffect(() => {
    setPendingValue('');
  }, [todo?.id]);

  const pendingTs = pendingValue ? new Date(pendingValue).getTime() : NaN;
  const hasValidPending = !Number.isNaN(pendingTs);

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    setPendingValue(e.target.value);
  };

  const handleConfirm = () => {
    if (!todo || !hasValidPending) return;
    const snapped = snapToFifteen(pendingTs);
    const next: Reminder[] = [
      ...reminders,
      { id: newReminderId(), remindAt: snapped, fired: false },
    ];
    setPendingValue('');
    void repo.update(todo.id, { reminders: next });
  };

  const handleRemove = (id: string) => {
    if (!todo) return;
    void repo.update(todo.id, {
      reminders: reminders.filter((r) => r.id !== id),
    });
  };

  const pickerLabel = hasValidPending
    ? formatReminderTime(pendingTs)
    : t.reminderPick;

  return (
    <Sheet open={todo !== null} onClose={onClose} title={t.reminderSheetTitle}>
      {todo && (
        <div className="text-textDim text-sm pb-3">
          {t.reminderSheetSubtitle(todo.title)}
        </div>
      )}
      {reminders.length === 0 ? (
        <div className="py-6 text-center text-textDim">{t.reminderEmpty}</div>
      ) : (
        <div className="flex flex-col">
          {reminders.map((r) => (
            <ReminderListItem key={r.id} reminder={r} onRemove={handleRemove} />
          ))}
        </div>
      )}
      {/*
        Anuluj is intentionally first in DOM order so Sheet's autofocus
        lands on it. iOS Safari opens the native datetime-local picker
        immediately on `.focus()` — if the input were the first focusable
        child, the picker would pop the moment the sheet mounts. Flex
        `order` preserves the visible layout: picker on top, then confirm,
        then Anuluj.
      */}
      <div className="flex flex-col gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full text-textDim h-12 order-3"
        >
          {t.cancel}
        </button>
        <div className="relative w-full h-12 order-1">
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-bgRaised text-text rounded-field font-medium pointer-events-none border border-hairline"
          >
            {pickerLabel}
          </div>
          <input
            data-testid="reminder-input"
            type="datetime-local"
            step="900"
            value={pendingValue}
            onChange={handlePick}
            aria-label={t.reminderPick}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasValidPending}
          className="w-full bg-accent text-accentInk rounded-field font-medium h-12 order-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.reminderAdd}
        </button>
      </div>
    </Sheet>
  );
}
