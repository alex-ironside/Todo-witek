import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordScreen from './ResetPasswordScreen';
import { t } from '../../i18n';

const resetPassword = vi.fn();
vi.mock('../../firebase/auth', () => ({
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

const renderScreen = () => {
  const onBack = vi.fn();
  const onSent = vi.fn();
  render(<ResetPasswordScreen onBack={onBack} onSent={onSent} />);
  return { onBack, onSent };
};

describe('ResetPasswordScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders heading, hint, field, submit, and back button', () => {
    renderScreen();
    expect(
      screen.getByRole('heading', { name: t.resetTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.resetHint)).toBeInTheDocument();
    expect(screen.getByLabelText(t.loginEmail)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t.resetSubmit }),
    ).toBeInTheDocument();
  });

  it('shows empty-email error and does not call resetPassword', async () => {
    const user = userEvent.setup();
    const { onSent } = renderScreen();
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    expect(screen.getByText(t.resetEmptyError)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('calls onBack when chevron back button clicked', async () => {
    const user = userEvent.setup();
    const { onBack } = renderScreen();
    const buttons = screen.getAllByRole('button');
    // BackButton is the first button rendered
    await user.click(buttons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls resetPassword and onSent on successful submit', async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue(undefined);
    const { onSent } = renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith('a@b.com'),
    );
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it('shows busy label while resetPassword is pending and disables submit', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    resetPassword.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    const busyButton = await screen.findByRole('button', {
      name: t.resetSubmitBusy,
    });
    expect(busyButton).toBeDisabled();
    resolve();
  });

  it('shows error message when resetPassword rejects', async () => {
    const user = userEvent.setup();
    resetPassword.mockRejectedValue(new Error('user-not-found'));
    renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    expect(await screen.findByText('user-not-found')).toBeInTheDocument();
  });
});
