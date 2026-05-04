// Absolute Polish date+time formatter for the reminders sheet list, e.g.
// "śr., 5 maj 14:30". Coexists intentionally with `formatRemindAt` in
// `dateUtils.ts`, which renders relative strings ("Dziś, 14:30") for the
// per-row reminder badge. The sheet shows up to N reminders for the same
// todo where relative phrasing would collide, so each row gets an absolute
// date — they are NOT duplicates.
const fmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatReminderTime = (ts: number): string =>
  fmt.format(new Date(ts));
