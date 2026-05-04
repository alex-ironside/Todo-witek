import { useEffect, useState } from 'react';

// Returns Date.now() and re-renders every `intervalMs` so consumers can
// recompute time-relative labels without manual ticking. Default 30s is
// fine-grained enough for "X minut temu" and cheap enough to ignore.
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
