import { ACCENTS, DEFAULT_ACCENT, type AccentKey } from '../theme/accents';
import type { Unsubscribe } from '../types';

export const ACCENT_STORAGE_KEY = 'tw:accent';
const CHANGE_EVENT = 'tw:accent-changed';

const isAccentKey = (v: unknown): v is AccentKey =>
  typeof v === 'string' && v in ACCENTS;

export const getAccent = (): AccentKey => {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT;
  const v = localStorage.getItem(ACCENT_STORAGE_KEY);
  return isAccentKey(v) ? v : DEFAULT_ACCENT;
};

export const applyAccentToDocument = (key: AccentKey): void => {
  if (typeof document === 'undefined') return;
  const a = ACCENTS[key];
  document.documentElement.style.setProperty('--color-accent', a.oklch);
  document.documentElement.style.setProperty('--color-accentInk', a.ink);
};

export const setAccent = (key: AccentKey): void => {
  localStorage.setItem(ACCENT_STORAGE_KEY, key);
  applyAccentToDocument(key);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const onAccentChange = (
  callback: (key: AccentKey) => void
): Unsubscribe => {
  const onChange = () => callback(getAccent());
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACCENT_STORAGE_KEY) callback(getAccent());
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
};
