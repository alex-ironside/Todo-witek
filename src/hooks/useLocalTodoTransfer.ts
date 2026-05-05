import { useCallback, useEffect, useState } from 'react';
import { LOCAL_TODOS_KEY } from '../repos/localTodoRepo';
import { transferLocalTodosTo } from '../services/transferLocalTodos';
import { t } from '../i18n';
import type { Todo, TodoRepository } from '../types';

export interface LocalTransferState {
  localCount: number;
  busy: boolean;
  message: string | null;
  onTransfer: () => Promise<void>;
}

const LOCAL_CHANGE_EVENT = 'todo-witek:todos-changed';

const readCount = (): number => {
  try {
    const raw = localStorage.getItem(LOCAL_TODOS_KEY);
    return raw ? (JSON.parse(raw) as Todo[]).length : 0;
  } catch {
    return 0;
  }
};

// Tracks how many todos are sitting in the local-only store and exposes a
// run() that copies them into the supplied destination (typically the
// signed-in user's Firebase repo) before clearing the local store.
export const useLocalTodoTransfer = (
  destination: TodoRepository
): LocalTransferState => {
  const [localCount, setLocalCount] = useState<number>(readCount);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setLocalCount(readCount());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_TODOS_KEY) sync();
    };
    window.addEventListener(LOCAL_CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCAL_CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const onTransfer = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { transferred } = await transferLocalTodosTo(destination, {
        clearLocalAfter: true,
      });
      setMessage(t.transferDone(transferred));
    } catch {
      setMessage(t.transferFailed);
    } finally {
      setBusy(false);
    }
  }, [destination]);

  return { localCount, busy, message, onTransfer };
};
