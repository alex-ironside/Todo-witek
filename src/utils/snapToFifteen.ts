// Snaps an epoch-ms timestamp to the nearest 15-minute boundary using
// Math.round (half-away-from-zero for positive values). The reminder
// scheduler downstream relies on minute-level alignment to deduplicate and
// group firings; preserving this rounding semantic keeps existing reminders
// bit-identical with the pre-Phase-7 ReminderEditor behavior.
export const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export const snapToFifteen = (ts: number): number =>
  Math.round(ts / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
