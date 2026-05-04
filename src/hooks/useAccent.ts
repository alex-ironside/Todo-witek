import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAccent,
  setAccent as svcSetAccent,
  onAccentChange,
} from '../services/accent';
import {
  getStorageMode,
  onStorageModeChange,
} from '../services/storageMode';
import { observeAuth } from '../firebase/auth';
import { getCloudAccent, setCloudAccent } from '../firebase/accent';
import type { AccentKey } from '../theme/accents';

const DEBOUNCE_MS = 250;

export const useAccent = (): [AccentKey, (key: AccentKey) => void] => {
  const [accent, setAccentState] = useState<AccentKey>(getAccent);
  const lastCloudRef = useRef<AccentKey | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uidRef = useRef<string | null>(null);
  const modeRef = useRef(getStorageMode());

  useEffect(() => onAccentChange(setAccentState), []);

  useEffect(
    () =>
      onStorageModeChange((m) => {
        modeRef.current = m;
      }),
    []
  );

  useEffect(() => {
    const unsub = observeAuth(async (user) => {
      uidRef.current = user?.uid ?? null;
      if (modeRef.current !== 'firebase' || !user) return;
      const cloud = await getCloudAccent(user.uid);
      if (cloud) {
        lastCloudRef.current = cloud;
        if (cloud !== getAccent()) svcSetAccent(cloud);
      } else {
        const local = getAccent();
        lastCloudRef.current = local;
        await setCloudAccent(user.uid, local);
      }
    });
    return unsub;
  }, []);

  const setter = useCallback((key: AccentKey) => {
    svcSetAccent(key);
    if (
      modeRef.current === 'firebase' &&
      uidRef.current &&
      key !== lastCloudRef.current
    ) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const uid = uidRef.current;
      timerRef.current = setTimeout(() => {
        lastCloudRef.current = key;
        void setCloudAccent(uid, key);
      }, DEBOUNCE_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return [accent, setter];
};
