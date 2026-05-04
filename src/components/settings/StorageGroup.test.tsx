import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StorageGroup from './StorageGroup';

describe('StorageGroup', () => {
  it('renders title and both segment labels', () => {
    const { getByText } = render(
      <StorageGroup mode="local" onChange={() => {}} />
    );
    expect(getByText('Przechowywanie')).toBeInTheDocument();
    expect(getByText('Lokalnie')).toBeInTheDocument();
    expect(getByText('Chmura')).toBeInTheDocument();
  });

  it('marks active segment by mode prop', () => {
    const { getByText } = render(
      <StorageGroup mode="firebase" onChange={() => {}} />
    );
    expect(getByText('Chmura').getAttribute('aria-pressed')).toBe('true');
    expect(getByText('Lokalnie').getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking inactive segment calls onChange with the right internal value', () => {
    const onChange = vi.fn();
    const { getByText, rerender } = render(
      <StorageGroup mode="local" onChange={onChange} />
    );
    fireEvent.click(getByText('Chmura'));
    expect(onChange).toHaveBeenCalledWith('firebase');

    onChange.mockClear();
    rerender(<StorageGroup mode="firebase" onChange={onChange} />);
    fireEvent.click(getByText('Lokalnie'));
    expect(onChange).toHaveBeenCalledWith('local');
  });
});
