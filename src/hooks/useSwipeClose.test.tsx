import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { render, act } from '@testing-library/react';
import { useSwipeClose } from './useSwipeClose';

interface HarnessProps {
  enabled: boolean;
  onClose: () => void;
}

function Harness({ enabled, onClose }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { dragX } = useSwipeClose(ref, onClose, enabled);
  return (
    <div ref={ref} data-testid="panel" data-dragx={dragX}>
      <button type="button" data-testid="inner-btn">btn</button>
      plain
    </div>
  );
}

// jsdom strips clientX/pointerId/timeStamp from RTL's fireEvent helpers,
// so we synthesize plain Events with the props we need and dispatch them.
const dispatch = (
  el: Element,
  type: string,
  clientX: number,
  timeStamp: number,
  target?: Element,
) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: clientX });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'timeStamp', { value: timeStamp });
  (target ?? el).dispatchEvent(ev);
};

const down = (el: Element, clientX: number, timeStamp = 0, target?: Element) =>
  dispatch(el, 'pointerdown', clientX, timeStamp, target);
const move = (el: Element, clientX: number, timeStamp = 0) =>
  dispatch(el, 'pointermove', clientX, timeStamp);
const up = (el: Element, clientX: number, timeStamp = 0) =>
  dispatch(el, 'pointerup', clientX, timeStamp);

describe('useSwipeClose', () => {
  it('calls onClose when drag exceeds -80px hard threshold', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 200, 0);
      move(panel, 100, 100);
      up(panel, 100, 200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when drag past -30px AND velocity > 0.3 px/ms', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    // 50px in 100ms = 0.5 px/ms
    act(() => {
      down(panel, 200, 0);
      move(panel, 150, 50);
      up(panel, 150, 100);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose for short slow drag', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    // 20px in 500ms = 0.04 px/ms (slow, short)
    act(() => {
      down(panel, 200, 0);
      move(panel, 180, 250);
      up(panel, 180, 500);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT call onClose for rightward drag', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 100, 0);
      move(panel, 300, 50);
      up(panel, 300, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT call onClose when disabled', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled={false} onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 200, 0);
      move(panel, 50, 50);
      up(panel, 50, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores swipes that originate on a button child', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    const btn = getByTestId('inner-btn');
    act(() => {
      down(panel, 200, 0, btn);
      move(panel, 50, 50);
      up(panel, 50, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('updates dragX state during pointermove (clamped to <= 0)', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 200, 0);
      move(panel, 150, 50);
    });
    expect(panel.getAttribute('data-dragx')).toBe('-50');
    act(() => {
      // Right of start clamps to 0
      move(panel, 300, 80);
    });
    expect(panel.getAttribute('data-dragx')).toBe('0');
    act(() => {
      up(panel, 300, 100);
    });
  });
});
