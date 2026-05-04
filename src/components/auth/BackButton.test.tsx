import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackButton from './BackButton';

describe('BackButton', () => {
  it('renders the label', () => {
    render(<BackButton onClick={() => {}} label="Wstecz" />);
    expect(screen.getByRole('button', { name: 'Wstecz' })).toBeInTheDocument();
  });

  it('invokes onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<BackButton onClick={onClick} label="Wstecz" />);
    await user.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
