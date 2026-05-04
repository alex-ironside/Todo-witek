import { describe, it, expect } from 'vitest';
import { ACCENTS, ACCENT_KEYS, DEFAULT_ACCENT, type AccentKey } from './accents';

describe('ACCENTS palette (THEME-02)', () => {
  it('exposes exactly 5 accent keys', () => {
    expect(Object.keys(ACCENTS).sort()).toEqual(
      ['amber', 'mint', 'rose', 'sky', 'violet']
    );
  });

  it.each([
    ['amber',  'oklch(0.78 0.13 70)',  'Bursztyn'],
    ['rose',   'oklch(0.74 0.13 18)',  'Róż'],
    ['mint',   'oklch(0.78 0.11 165)', 'Mięta'],
    ['violet', 'oklch(0.72 0.13 290)', 'Fiolet'],
    ['sky',    'oklch(0.78 0.10 235)', 'Błękit'],
  ] as const)('%s has correct OKLCH and Polish label', (key, oklch, label) => {
    const entry = ACCENTS[key as AccentKey];
    expect(entry.oklch).toBe(oklch);
    expect(entry.label).toBe(label);
    expect(entry.ink).toBe('oklch(0.20 0.020 60)');
  });

  it('default accent is amber', () => {
    expect(DEFAULT_ACCENT).toBe('amber');
  });

  it('ACCENT_KEYS lists all five keys', () => {
    expect([...ACCENT_KEYS].sort()).toEqual(['amber', 'mint', 'rose', 'sky', 'violet']);
  });

  it('AccentKey type accepts each key (compile-time)', () => {
    const k: AccentKey = 'amber';
    expect(k).toBe('amber');
  });
});
