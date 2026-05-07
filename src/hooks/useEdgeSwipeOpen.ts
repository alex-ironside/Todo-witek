import { useEffect } from 'react';

const EDGE_THRESHOLD_PX = 20;
const HARD_DISTANCE_PX = 60;
const SOFT_DISTANCE_PX = 30;
const SOFT_VELOCITY = 0.3; // px/ms

// Document-level pointer detector for the iOS-style "swipe in from the
// left edge" gesture. Mirrors useSwipeClose's thresholds in reverse so
// open and close gestures feel symmetric. Disabled while the drawer is
// already open so close-swipes don't immediately re-open it.
export function useEdgeSwipeOpen(
  onOpen: () => void,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startTime = 0;
    let lastDx = 0;
    let active = false;

    const onDown = (e: PointerEvent) => {
      if (e.clientX > EDGE_THRESHOLD_PX) return;
      active = true;
      startX = e.clientX;
      startTime = e.timeStamp;
      lastDx = 0;
    };

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      lastDx = e.clientX - startX;
    };

    const finish = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dt = Math.max(1, e.timeStamp - startTime);
      const velocity = lastDx / dt;
      const shouldOpen =
        lastDx > HARD_DISTANCE_PX ||
        (lastDx > SOFT_DISTANCE_PX && velocity > SOFT_VELOCITY);
      if (shouldOpen) onOpen();
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    };
  }, [onOpen, enabled]);
}
