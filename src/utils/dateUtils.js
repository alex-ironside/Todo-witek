// Pure helpers for reminder times. No I/O, no globals — easy to unit test.

export const isDue = (remindAt, now) => remindAt <= now;

export const nextDueReminder = (reminders, now) => {
  const upcoming = reminders.filter((r) => !r.fired && r.remindAt > now);
  if (upcoming.length === 0) return null;
  return upcoming.reduce((min, r) => (r.remindAt < min.remindAt ? r : min));
};

export const formatRemindAt = (ts) => {
  if (ts === null || ts === undefined) return '';
  return new Date(ts).toLocaleString();
};
