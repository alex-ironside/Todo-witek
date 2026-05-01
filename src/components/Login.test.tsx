import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { t } from '../i18n';

const login = vi.fn();
const resetPassword = vi.fn();

vi.mock('../firebase/auth', () => ({
  login: (...args: unknown[]) => login(...args),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

vi.mock('./StorageModeToggle', () => ({
  default: () => <div />,
}));

vi.mock('./InstallButton', () => ({
  default: () => <div />,
}));

const renderLogin = () =>
  render(<Login mode="firebase" onModeChange={() => {}} />);

describe('Login — reset password section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a button that opens the reset password section', async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(
      screen.queryByRole('heading', { name: t.resetPasswordTitle })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t.resetPasswordOpen }));

    expect(
      screen.getByRole('heading', { name: t.resetPasswordTitle })
    ).toBeInTheDocument();
  });

  it('calls resetPassword with the entered email and shows a success message', async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue(undefined);
    renderLogin();

    await user.click(screen.getByRole('button', { name: t.resetPasswordOpen }));

    const emailField = screen.getByLabelText(t.resetPasswordTitle);
    await user.type(emailField, 'forgot@example.com');
    await user.click(
      screen.getByRole('button', { name: t.resetPasswordSubmit })
    );

    expect(resetPassword).toHaveBeenCalledWith('forgot@example.com');
    expect(await screen.findByText(t.resetPasswordSuccess)).toBeInTheDocument();
  });

  it('surfaces an error when resetPassword rejects', async () => {
    const user = userEvent.setup();
    resetPassword.mockRejectedValue(new Error('user-not-found'));
    renderLogin();

    await user.click(screen.getByRole('button', { name: t.resetPasswordOpen }));

    await user.type(
      screen.getByLabelText(t.resetPasswordTitle),
      'missing@example.com'
    );
    await user.click(
      screen.getByRole('button', { name: t.resetPasswordSubmit })
    );

    expect(await screen.findByText('user-not-found')).toBeInTheDocument();
  });

  it('hides the section when the user clicks back to login', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: t.resetPasswordOpen }));
    await user.click(
      screen.getByRole('button', { name: t.resetPasswordBackToLogin })
    );

    expect(
      screen.queryByRole('heading', { name: t.resetPasswordTitle })
    ).not.toBeInTheDocument();
  });
});
