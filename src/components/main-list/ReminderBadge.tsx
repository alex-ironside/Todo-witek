import type { Reminder } from '../../types';
import { useNow } from '../../hooks/useNow';
import { formatRelative } from '../../utils/relativeTime';

interface ReminderBadgeProps {
  reminders: Reminder[];
}

// Renders a small bell + relative-time line for the soonest unfired
// reminder. Returns null when there's nothing to show — caller doesn't
// need to gate.
export default function ReminderBadge({ reminders }: ReminderBadgeProps) {
  const now = useNow();
  const upcoming = reminders.filter((r) => !r.fired);
  if (upcoming.length === 0) return null;
  const soonest = upcoming.reduce((a, b) =>
    Math.abs(a.remindAt - now) <= Math.abs(b.remindAt - now) ? a : b
  );
  return (
    <span className="inline-flex items-center gap-1 text-textDim text-[13px]">
      <svg
        data-testid="reminder-bell"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
      {formatRelative(soonest.remindAt, now)}
    </span>
  );
}
