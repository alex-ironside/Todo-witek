import type { Unsubscribe } from '../types';

export type StorageMode = 'local' | 'firebase';

export const STORAGE_MODE_KEY = 'todo-witek:storage-mode';
const CHANGE_EVENT = 'todo-witek:storage-mode-changed';

const isMode = (v: string | null): v is StorageMode =>
  v === 'local' || v === 'firebase';

export const getStorageMode = (): StorageMode => {
  if (typeof localStorage === 'undefined') return 'local';
  const v = localStorage.getItem(STORAGE_MODE_KEY);
  return isMode(v) ? v : 'local';
};

export const setStorageMode = (mode: StorageMode): void => {
  localStorage.setItem(STORAGE_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const onStorageModeChange = (
  callback: (mode: StorageMode) => void
): Unsubscribe => {
  const onChange = () => callback(getStorageMode());
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_MODE_KEY) callback(getStorageMode());
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
};
