import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Switch from './Switch';

describe('Switch', () => {
  it('renders with role=switch and aria-checked reflecting checked', () => {
    const { getByRole, rerender } = render(
      <Switch checked={false} onChange={() => {}} ariaLabel="Push" />
    );
    const sw = getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    rerender(<Switch checked={true} onChange={() => {}} ariaLabel="Push" />);
    expect(getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('click calls onChange with the negated value', () => {
    const onChange = vi.fn();
    const { getByRole, rerender } = render(
      <Switch checked={false} onChange={onChange} ariaLabel="x" />
    );
    fireEvent.click(getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);

    onChange.mockClear();
    rerender(<Switch checked={true} onChange={onChange} ariaLabel="x" />);
    fireEvent.click(getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disabled prop blocks onChange and sets aria-disabled', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <Switch checked={false} onChange={onChange} ariaLabel="x" disabled />
    );
    const sw = getByRole('switch');
    expect(sw.hasAttribute('disabled')).toBe(true);
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });
});
