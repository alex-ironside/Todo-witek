import { useEffect, useState, type RefObject } from 'react';

export interface UseDragToDismissResult {
  dragY: number;
}

// Distance below the panel top within which a pointerdown is treated as a
// drag-handle gesture. Anywhere below is left to children (so list scrolling
// and form controls work normally).
const HANDLE_ZONE_PX = 32;
// Drag distance past which the sheet closes regardless of velocity.
const CLOSE_DISTANCE_PX = 80;
// Velocity (px/ms) past which a short drag still closes — flick-to-dismiss.
const CLOSE_VELOCITY_PX_PER_MS = 0.4;

// Vertical mirror of useSwipeClose. Tracks downward pointer drags that begin
// in the top HANDLE_ZONE_PX of the panel and reports the live offset; calls
// onClose() when the user releases past the distance OR velocity threshold.
// Drags originating on form controls inside the sheet are ignored so the
// datetime-local input stays usable.
export function useDragToDismiss(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
): UseDragToDismissResult {
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDragY(0);
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;

    let startY = 0;
    let startTime = 0;
    let lastDy = 0;
    let active = false;

    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('button,input,a,select,textarea')
      ) {
        return;
      }
      const rect = panel.getBoundingClientRect();
      if (e.clientY - rect.top >= HANDLE_ZONE_PX) return;
      active = true;
      startY = e.clientY;
      startTime = e.timeStamp;
      lastDy = 0;
      try {
        panel.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture may not be available in test environments
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dy = Math.max(0, e.clientY - startY);
      lastDy = dy;
      setDragY(dy);
    };

    const finish = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dt = Math.max(1, e.timeStamp - startTime);
      const velocity = lastDy / dt; // px/ms (downward only by clamp above)
      const shouldClose =
        lastDy > CLOSE_DISTANCE_PX ||
        (lastDy > 20 && velocity > CLOSE_VELOCITY_PX_PER_MS);
      setDragY(0);
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

  return { dragY };
}
