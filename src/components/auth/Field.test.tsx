import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Field from './Field';

describe('Field', () => {
  it('associates the label with the input', () => {
    render(<Field label="E-mail" type="email" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('calls onChange when the user types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Field label="E-mail" type="email" value="" onChange={onChange} />,
    );
    await user.type(screen.getByLabelText('E-mail'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('respects autoComplete', () => {
    render(
      <Field
        label="Hasło"
        type="password"
        value=""
        onChange={() => {}}
        autoComplete="current-password"
      />,
    );
    expect(screen.getByLabelText('Hasło')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });
});
