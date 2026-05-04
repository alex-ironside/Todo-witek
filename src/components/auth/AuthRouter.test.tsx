import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthRouter from './AuthRouter';
import { t } from '../../i18n';

const login = vi.fn();
const resetPassword = vi.fn();
vi.mock('../../firebase/auth', () => ({
  login: (...args: unknown[]) => login(...args),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

describe('AuthRouter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts on the login screen', () => {
    render(<AuthRouter onUseLocal={() => {}} />);
    expect(
      screen.getByRole('heading', { name: t.loginTitle }),
    ).toBeInTheDocument();
  });

  it('navigates from login to reset when forgot link is clicked', async () => {
    const user = userEvent.setup();
    render(<AuthRouter onUseLocal={() => {}} />);
    await user.click(screen.getByRole('button', { name: t.loginForgot }));
    expect(
      screen.getByRole('heading', { name: t.resetTitle }),
    ).toBeInTheDocument();
  });

  it('navigates from reset to reset-sent on successful submit', async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue(undefined);
    render(<AuthRouter onUseLocal={() => {}} />);
    await user.click(screen.getByRole('button', { name: t.loginForgot }));
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: t.resetSentTitle }),
      ).toBeInTheDocument(),
    );
  });

  it('navigates from reset-sent back to login when back button is clicked', async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue(undefined);
    render(<AuthRouter onUseLocal={() => {}} />);
    await user.click(screen.getByRole('button', { name: t.loginForgot }));
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.resetSubmit }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: t.resetSentTitle }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: t.resetBack }));
    expect(
      screen.getByRole('heading', { name: t.loginTitle }),
    ).toBeInTheDocument();
  });

  it('navigates from reset back to login via back chevron', async () => {
    const user = userEvent.setup();
    render(<AuthRouter onUseLocal={() => {}} />);
    await user.click(screen.getByRole('button', { name: t.loginForgot }));
    // back button is the first button on reset screen
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(
      screen.getByRole('heading', { name: t.loginTitle }),
    ).toBeInTheDocument();
  });

  it('passes onUseLocal through to the login screen', async () => {
    const user = userEvent.setup();
    const onUseLocal = vi.fn();
    render(<AuthRouter onUseLocal={onUseLocal} />);
    await user.click(screen.getByRole('button', { name: t.loginUseLocal }));
    expect(onUseLocal).toHaveBeenCalledTimes(1);
  });
});
