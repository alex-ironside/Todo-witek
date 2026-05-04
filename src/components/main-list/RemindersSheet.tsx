import { type ChangeEvent } from 'react';
import Sheet from './Sheet';
import ReminderListItem from './ReminderListItem';
import { useRepo } from '../../hooks/RepoContext';
import { snapToFifteen } from '../../utils/snapToFifteen';
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
export default function RemindersSheet({ todo, onClose }: Props) {
  const repo = useRepo();
  const reminders: Reminder[] = todo?.reminders ?? [];

  const handleAdd = (e: ChangeEvent<HTMLInputElement>) => {
    if (!todo) return;
    const raw = e.target.value;
    if (!raw) return;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return;
    const snapped = snapToFifteen(ts);
    const next: Reminder[] = [
      ...reminders,
      { id: newReminderId(), remindAt: snapped, fired: false },
    ];
    e.target.value = '';
    void repo.update(todo.id, { reminders: next });
  };

  const handleRemove = (id: string) => {
    if (!todo) return;
    void repo.update(todo.id, {
      reminders: reminders.filter((r) => r.id !== id),
    });
  };

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
        child, the picker would pop the moment the sheet mounts and stay
        focused (so subsequent taps wouldn't reopen it). Flex `order`
        preserves the visible layout: Dodaj termin on top, Anuluj below.
      */}
      <div className="flex flex-col gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full text-textDim h-12 order-2"
        >
          {t.cancel}
        </button>
        <div className="relative w-full h-12 order-1">
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-accent text-accentInk rounded-field font-medium pointer-events-none"
          >
            {t.reminderAdd}
          </div>
          <input
            data-testid="reminder-input"
            type="datetime-local"
            step="900"
            onChange={handleAdd}
            aria-label={t.reminderAdd}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </Sheet>
  );
}
