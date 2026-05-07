import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEdgeSwipeOpen } from './useEdgeSwipeOpen';

interface HarnessProps {
  enabled: boolean;
  onOpen: () => void;
}

function Harness({ enabled, onOpen }: HarnessProps) {
  useEdgeSwipeOpen(onOpen, enabled);
  return <div data-testid="root">root</div>;
}

const dispatch = (
  type: string,
  clientX: number,
  timeStamp: number,
  target: Element = document.body
) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: clientX });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(ev);
};

const down = (clientX: number, timeStamp = 0, target?: Element) =>
  dispatch('pointerdown', clientX, timeStamp, target);
const move = (clientX: number, timeStamp = 0) =>
  dispatch('pointermove', clientX, timeStamp);
const up = (clientX: number, timeStamp = 0) =>
  dispatch('pointerup', clientX, timeStamp);

describe('useEdgeSwipeOpen', () => {
  it('opens when a touch starts at the left edge and drags past +60px', () => {
    const onOpen = vi.fn();
    render(<Harness enabled onOpen={onOpen} />);
    act(() => {
      down(5, 0);
      move(80, 100);
      up(80, 200);
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens when drag past +30px AND velocity > 0.3 px/ms', () => {
    const onOpen = vi.fn();
    render(<Harness enabled onOpen={onOpen} />);
    // 50px in 100ms = 0.5 px/ms
    act(() => {
      down(5, 0);
      move(55, 50);
      up(55, 100);
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does NOT open when the touch starts off-edge', () => {
    const onOpen = vi.fn();
    render(<Harness enabled onOpen={onOpen} />);
    act(() => {
      down(60, 0);
      move(160, 100);
      up(160, 200);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does NOT open for a short slow drag', () => {
    const onOpen = vi.fn();
    render(<Harness enabled onOpen={onOpen} />);
    // 20px in 500ms = 0.04 px/ms
    act(() => {
      down(5, 0);
      move(25, 250);
      up(25, 500);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does NOT open for a leftward drag', () => {
    const onOpen = vi.fn();
    render(<Harness enabled onOpen={onOpen} />);
    act(() => {
      down(5, 0);
      move(-50, 50);
      up(-50, 100);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does NOT open when disabled', () => {
    const onOpen = vi.fn();
    render(<Harness enabled={false} onOpen={onOpen} />);
    act(() => {
      down(5, 0);
      move(120, 100);
      up(120, 200);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('detaches its listener on unmount', () => {
    const onOpen = vi.fn();
    const { unmount } = render(<Harness enabled onOpen={onOpen} />);
    unmount();
    act(() => {
      down(5, 0);
      move(120, 100);
      up(120, 200);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
