import { describe, it, expect } from 'vitest';
import { snapToFifteen, FIFTEEN_MIN_MS } from './snapToFifteen';

describe('snapToFifteen', () => {
  it('preserves exact 0', () => {
    expect(snapToFifteen(0)).toBe(0);
  });

  it('preserves an exact 15-min boundary', () => {
    expect(snapToFifteen(FIFTEEN_MIN_MS)).toBe(FIFTEEN_MIN_MS);
    expect(snapToFifteen(FIFTEEN_MIN_MS * 7)).toBe(FIFTEEN_MIN_MS * 7);
  });

  it('rounds 7 minutes past a boundary down to that boundary', () => {
    const sevenMin = 7 * 60 * 1000;
    expect(snapToFifteen(sevenMin)).toBe(0);
  });

  it('rounds 8 minutes past a boundary up to the next boundary', () => {
    const eightMin = 8 * 60 * 1000;
    expect(snapToFifteen(eightMin)).toBe(FIFTEEN_MIN_MS);
  });

  it('rounds exactly 7.5 min up (Math.round half-away-from-zero for positives)', () => {
    const halfMin = 7.5 * 60 * 1000;
    expect(snapToFifteen(halfMin)).toBe(FIFTEEN_MIN_MS);
  });

  it('snaps slightly negative ts to 0', () => {
    expect(Object.is(snapToFifteen(-1), 0) || Object.is(snapToFifteen(-1), -0)).toBe(true);
  });

  it('snaps a clearly negative timestamp to nearest boundary', () => {
    expect(snapToFifteen(-FIFTEEN_MIN_MS - 100)).toBe(-FIFTEEN_MIN_MS);
  });

  it('snaps 2026-05-01T10:08 to :15', () => {
    const ts = new Date('2026-05-01T10:08').getTime();
    const snapped = snapToFifteen(ts);
    expect(snapped % FIFTEEN_MIN_MS).toBe(0);
    expect(new Date(snapped).getMinutes()).toBe(15);
  });

  it('snaps 2026-05-01T10:07 to :00', () => {
    const ts = new Date('2026-05-01T10:07').getTime();
    const snapped = snapToFifteen(ts);
    expect(snapped % FIFTEEN_MIN_MS).toBe(0);
    expect(new Date(snapped).getMinutes()).toBe(0);
  });

  it('always returns a multiple of FIFTEEN_MIN_MS', () => {
    for (const offset of [0, 1, 60_000, 7 * 60_000, 8 * 60_000, 14 * 60_000, 22 * 60_000]) {
      expect(snapToFifteen(offset) % FIFTEEN_MIN_MS).toBe(0);
    }
  });
});
