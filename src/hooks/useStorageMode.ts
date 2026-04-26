import { useEffect, useState } from 'react';
import {
  getStorageMode,
  onStorageModeChange,
  setStorageMode,
  type StorageMode,
} from '../services/storageMode';

export const useStorageMode = (): [StorageMode, (mode: StorageMode) => void] => {
  const [mode, setMode] = useState<StorageMode>(getStorageMode);

  useEffect(() => onStorageModeChange(setMode), []);

  return [mode, setStorageMode];
};
