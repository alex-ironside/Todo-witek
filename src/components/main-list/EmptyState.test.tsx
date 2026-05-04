import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the Polish empty + hint strings', () => {
    const { getByText } = render(<EmptyState />);
    expect(getByText('Brak zadań.')).toBeInTheDocument();
    expect(getByText('Dodaj pierwsze powyżej.')).toBeInTheDocument();
  });

  it('uses textDim for the headline and textMute for the hint', () => {
    const { getByText } = render(<EmptyState />);
    expect(getByText('Brak zadań.').className).toMatch(/text-textDim/);
    expect(getByText('Dodaj pierwsze powyżej.').className).toMatch(/text-textMute/);
  });
});
