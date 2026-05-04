import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ACCENTS, DEFAULT_ACCENT } from '../theme/accents';
import {
  ACCENT_STORAGE_KEY,
  getAccent,
  setAccent,
  onAccentChange,
} from './accent';

describe('accent service', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('defaults to amber when nothing is set', () => {
    expect(getAccent()).toBe(DEFAULT_ACCENT);
  });

  it('reads valid value from localStorage', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'rose');
    expect(getAccent()).toBe('rose');
  });

  it('falls back to default for unrecognized values', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'fuchsia');
    expect(getAccent()).toBe(DEFAULT_ACCENT);
  });

  it('setAccent persists to localStorage', () => {
    setAccent('mint');
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('mint');
  });

  it('setAccent applies --color-accent and --color-accentInk to documentElement', () => {
    setAccent('violet');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-accent')).toBe(ACCENTS.violet.oklch);
    expect(style.getPropertyValue('--color-accentInk')).toBe(ACCENTS.violet.ink);
  });

  it('onAccentChange fires when setAccent is called same-tab', () => {
    const cb = vi.fn();
    const off = onAccentChange(cb);
    setAccent('sky');
    expect(cb).toHaveBeenCalledWith('sky');
    off();
  });

  it('onAccentChange unsubscribes', () => {
    const cb = vi.fn();
    const off = onAccentChange(cb);
    off();
    setAccent('rose');
    expect(cb).not.toHaveBeenCalled();
  });
});
