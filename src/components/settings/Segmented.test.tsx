import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Segmented from './Segmented';

type Mode = 'a' | 'b';

const opts = [
  { value: 'a' as Mode, label: 'Alpha' },
  { value: 'b' as Mode, label: 'Beta' },
];

describe('Segmented', () => {
  it('renders both labels', () => {
    const { getByText } = render(
      <Segmented<Mode> value="a" onChange={() => {}} options={opts} />
    );
    expect(getByText('Alpha')).toBeInTheDocument();
    expect(getByText('Beta')).toBeInTheDocument();
  });

  it('marks the active segment with aria-pressed=true', () => {
    const { getByText } = render(
      <Segmented<Mode> value="b" onChange={() => {}} options={opts} />
    );
    expect(getByText('Beta').getAttribute('aria-pressed')).toBe('true');
    expect(getByText('Alpha').getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking inactive segment fires onChange with that value', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <Segmented<Mode> value="a" onChange={onChange} options={opts} />
    );
    fireEvent.click(getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('clicking active segment does not refire onChange', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <Segmented<Mode> value="a" onChange={onChange} options={opts} />
    );
    fireEvent.click(getByText('Alpha'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
