import { describe, it, expect } from 'vitest';
import { formatRelative } from './relativeTime';

describe('formatRelative (pl)', () => {
  const NOW = 1_700_000_000_000;

  it('returns a string for the same instant', () => {
    const result = formatRelative(NOW, NOW);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('uses minute bucket for ~1 minute in the future', () => {
    const result = formatRelative(NOW + 60_000, NOW);
    expect(result).toMatch(/minut/i);
  });

  it('uses minute bucket and indicates past for ~1 minute ago', () => {
    const result = formatRelative(NOW - 60_000, NOW);
    expect(result).toMatch(/minut/i);
    expect(result).toMatch(/temu/i);
  });

  it('uses hour bucket for 2 hours in the future', () => {
    const result = formatRelative(NOW + 2 * 3600_000, NOW);
    expect(result).toMatch(/godz/i);
  });

  it('uses day bucket for 3 days in the past', () => {
    const result = formatRelative(NOW - 3 * 86_400_000, NOW);
    expect(result).toMatch(/dni|dzień|dzien/i);
  });

  it('is pure: same args always produce the same output', () => {
    const a = formatRelative(NOW + 5000, NOW);
    const b = formatRelative(NOW + 5000, NOW);
    expect(a).toBe(b);
  });
});
