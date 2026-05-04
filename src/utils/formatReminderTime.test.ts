import { describe, it, expect } from 'vitest';
import { formatReminderTime } from './formatReminderTime';

describe('formatReminderTime', () => {
  it('includes the 2-digit hour and minute', () => {
    const ts = new Date('2026-05-05T14:30:00').getTime();
    const out = formatReminderTime(ts);
    expect(out).toContain('14:30');
  });

  it('includes the day-of-month', () => {
    const ts = new Date('2026-05-05T14:30:00').getTime();
    expect(formatReminderTime(ts)).toContain('5');
  });

  it('uses Polish month abbreviation (maj for May)', () => {
    const ts = new Date('2026-05-05T14:30:00').getTime();
    expect(formatReminderTime(ts).toLowerCase()).toContain('maj');
  });

  it('returns a Polish weekday prefix', () => {
    // 2026-05-05 was a Tuesday → "wt"
    const ts = new Date('2026-05-05T14:30:00').getTime();
    const out = formatReminderTime(ts).toLowerCase();
    expect(out).toMatch(/(pon|wt|śr|czw|pt|sob|niedz|nd)/);
  });

  it('is pure (same input produces same output)', () => {
    const ts = new Date('2026-05-05T14:30:00').getTime();
    expect(formatReminderTime(ts)).toBe(formatReminderTime(ts));
  });
});
