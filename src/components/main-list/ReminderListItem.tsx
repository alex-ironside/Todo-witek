import type { Reminder } from '../../types';
import { formatReminderTime } from '../../utils/formatReminderTime';
import { t } from '../../i18n';

interface Props {
  reminder: Reminder;
  onRemove: (id: string) => void;
}

// One row inside the reminders sheet: bell + absolute time, optional
// `wysłane` pill when the reminder has already fired, and a trailing × to
// remove. Removable regardless of fired state — preserves the existing
// pre-Phase-7 ReminderEditor behavior (spec leaves this to the codebase
// pattern).
export default function ReminderListItem({ reminder, onRemove }: Props) {
  const formatted = formatReminderTime(reminder.remindAt);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-hairlineSoft last:border-b-0">
      <svg
        data-testid="bell-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-accent flex-shrink-0"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <span className="text-text text-sm">{formatted}</span>
      {reminder.fired && (
        <span className="ml-2 text-xs text-textDim border border-hairline rounded-full px-2 py-0.5">
          {t.reminderFiredLabel}
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(reminder.id)}
        aria-label={t.reminderRemove(formatted)}
        className="ml-auto text-textMute hover:text-text px-2 py-1"
      >
        ×
      </button>
    </div>
  );
}
