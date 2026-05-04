import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { render, act } from '@testing-library/react';
import { useDragToDismiss } from './useDragToDismiss';

interface HarnessProps {
  enabled: boolean;
  onClose: () => void;
}

function Harness({ enabled, onClose }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { dragY } = useDragToDismiss(ref, onClose, enabled);
  return (
    <div ref={ref} data-testid="panel" data-dragy={dragY}>
      <button type="button" data-testid="inner-btn">btn</button>
      plain
    </div>
  );
}

const dispatch = (
  el: Element,
  type: string,
  clientY: number,
  timeStamp: number,
  target?: Element,
) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientY', { value: clientY });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'timeStamp', { value: timeStamp });
  (target ?? el).dispatchEvent(ev);
};

const down = (el: Element, clientY: number, timeStamp = 0, target?: Element) =>
  dispatch(el, 'pointerdown', clientY, timeStamp, target);
const move = (el: Element, clientY: number, timeStamp = 0) =>
  dispatch(el, 'pointermove', clientY, timeStamp);
const up = (el: Element, clientY: number, timeStamp = 0) =>
  dispatch(el, 'pointerup', clientY, timeStamp);

describe('useDragToDismiss', () => {
  it('starts at dragY === 0', () => {
    const { getByTestId } = render(<Harness enabled onClose={vi.fn()} />);
    expect(getByTestId('panel').getAttribute('data-dragy')).toBe('0');
  });

  it('updates dragY during downward drag (clamped to >= 0)', () => {
    const { getByTestId } = render(<Harness enabled onClose={vi.fn()} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 10, 0);
      move(panel, 50, 50);
    });
    expect(panel.getAttribute('data-dragy')).toBe('40');
    act(() => {
      // Upward clamps to 0
      move(panel, -20, 80);
    });
    expect(panel.getAttribute('data-dragy')).toBe('0');
    act(() => up(panel, -20, 100));
  });

  it('calls onClose when drag exceeds 80px hard threshold', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 10, 0);
      move(panel, 100, 200);
      up(panel, 100, 300);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on high-velocity short drag (>0.4 px/ms)', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    // 50px in 100ms = 0.5 px/ms
    act(() => {
      down(panel, 10, 0);
      move(panel, 60, 50);
      up(panel, 60, 100);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose for short slow drag', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    // 30px in 500ms = 0.06 px/ms
    act(() => {
      down(panel, 10, 0);
      move(panel, 40, 250);
      up(panel, 40, 500);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores pointerdown originating below the 32px handle zone', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 100, 0);
      move(panel, 300, 50);
      up(panel, 300, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.getAttribute('data-dragy')).toBe('0');
  });

  it('ignores drags originating on a button child', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled onClose={onClose} />);
    const panel = getByTestId('panel');
    const btn = getByTestId('inner-btn');
    act(() => {
      down(panel, 10, 0, btn);
      move(panel, 200, 50);
      up(panel, 200, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT call onClose when disabled', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness enabled={false} onClose={onClose} />);
    const panel = getByTestId('panel');
    act(() => {
      down(panel, 10, 0);
      move(panel, 200, 50);
      up(panel, 200, 100);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
