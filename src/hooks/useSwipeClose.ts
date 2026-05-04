import { useEffect, useState, type RefObject } from 'react';

export interface UseSwipeCloseResult {
  dragX: number;
}

// Pointer-event-based swipe-left detector for the drawer panel. Returns the
// live drag offset (clamped to <= 0) so the caller can render the panel
// following the finger; calls `onClose()` when the swipe crosses a hard
// distance threshold or has sufficient leftward velocity. Disabled while the
// drawer is closed. Ignores gestures that originated on interactive children
// so internal controls keep working.
export function useSwipeClose(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
): UseSwipeCloseResult {
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDragX(0);
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;

    let startX = 0;
    let startTime = 0;
    let lastDx = 0;
    let active = false;

    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('button,input,a,select,textarea')
      ) {
        return;
      }
      active = true;
      startX = e.clientX;
      startTime = e.timeStamp;
      lastDx = 0;
      try {
        panel.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture may not be available in test environments
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = Math.min(0, e.clientX - startX);
      lastDx = dx;
      setDragX(dx);
    };

    const finish = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dt = Math.max(1, e.timeStamp - startTime);
      const velocity = Math.abs(lastDx) / dt; // px/ms
      const shouldClose = lastDx < -80 || (lastDx < -30 && velocity > 0.3);
      setDragX(0);
      try {
        panel.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (shouldClose) onClose();
    };

    panel.addEventListener('pointerdown', onDown);
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', finish);
    panel.addEventListener('pointercancel', finish);
    return () => {
      panel.removeEventListener('pointerdown', onDown);
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', finish);
      panel.removeEventListener('pointercancel', finish);
    };
  }, [panelRef, onClose, enabled]);

  return { dragX };
}
