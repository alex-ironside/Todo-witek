import { useRef, type ChangeEvent } from 'react';
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
// itself — all reads/writes go through the injected repo. The hidden
// datetime-local input is the click target for the OS-native picker invoked
// via showPicker(); we keep it visually hidden so the spec's primary
// `Dodaj termin` button stays the visible affordance.
export default function RemindersSheet({ todo, onClose }: Props) {
  const repo = useRepo();
  const inputRef = useRef<HTMLInputElement>(null);
  const reminders: Reminder[] = todo?.reminders ?? [];

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      // showPicker is supported in modern Chromium/Safari/Firefox; older
      // browsers (or jsdom in tests with no stub) fall back silently — the
      // input is in the DOM and the user can still focus it by Tab.
      el.showPicker?.();
    } catch {
      // Throws if input is disconnected/not focusable; nothing to do here.
    }
  };

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
      <input
        ref={inputRef}
        data-testid="reminder-input"
        type="datetime-local"
        step="900"
        onChange={handleAdd}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="flex flex-col gap-2 pt-4">
        <button
          type="button"
          onClick={openPicker}
          className="w-full bg-accent text-accentInk rounded-field h-12 font-medium"
        >
          {t.reminderAdd}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-textDim h-12"
        >
          {t.cancel}
        </button>
      </div>
    </Sheet>
  );
}
