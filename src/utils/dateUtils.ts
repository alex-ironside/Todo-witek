import type { Reminder } from '../types';

// Pure helpers for reminder times. No I/O, no globals — easy to unit test.

export const isDue = (remindAt: number, now: number): boolean =>
  remindAt <= now;

export const nextDueReminder = (
  reminders: Reminder[],
  now: number
): Reminder | null => {
  const upcoming = reminders.filter((r) => !r.fired && r.remindAt > now);
  if (upcoming.length === 0) return null;
  return upcoming.reduce((min, r) => (r.remindAt < min.remindAt ? r : min));
};

export const formatRemindAt = (ts: number | null | undefined): string => {
  if (ts === null || ts === undefined) return '';
  return new Date(ts).toLocaleString();
};
