import { describe, it, expect } from 'vitest';
import { isDue, nextDueReminder, formatRemindAt } from './dateUtils';
import type { Reminder } from '../types';

describe('dateUtils', () => {
  describe('isDue', () => {
    it('returns true when reminder time is in the past', () => {
      expect(isDue(1000, 2000)).toBe(true);
    });

    it('returns true at the exact moment', () => {
      expect(isDue(1000, 1000)).toBe(true);
    });

    it('returns false when reminder is in the future', () => {
      expect(isDue(2000, 1000)).toBe(false);
    });
  });

  describe('nextDueReminder', () => {
    it('returns null when no reminders', () => {
      expect(nextDueReminder([], 1000)).toBeNull();
    });

    it('returns null when all reminders are fired', () => {
      const reminders: Reminder[] = [
        { id: 'a', remindAt: 500, fired: true },
      ];
      expect(nextDueReminder(reminders, 1000)).toBeNull();
    });

    it('returns the soonest unfired future reminder', () => {
      const reminders: Reminder[] = [
        { id: 'a', remindAt: 5000, fired: false },
        { id: 'b', remindAt: 3000, fired: false },
        { id: 'c', remindAt: 4000, fired: false },
      ];
      expect(nextDueReminder(reminders, 1000)).toEqual(reminders[1]);
    });

    it('skips fired reminders', () => {
      const reminders: Reminder[] = [
        { id: 'a', remindAt: 3000, fired: true },
        { id: 'b', remindAt: 5000, fired: false },
      ];
      expect(nextDueReminder(reminders, 1000)).toEqual(reminders[1]);
    });
  });

  describe('formatRemindAt', () => {
    it('formats a millisecond timestamp to a locale string', () => {
      const ts = new Date('2026-01-01T12:00:00Z').getTime();
      expect(typeof formatRemindAt(ts)).toBe('string');
      expect(formatRemindAt(ts).length).toBeGreaterThan(0);
    });

    it('returns empty string for null/undefined', () => {
      expect(formatRemindAt(null)).toBe('');
      expect(formatRemindAt(undefined)).toBe('');
    });
  });
});
