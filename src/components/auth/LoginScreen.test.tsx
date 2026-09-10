import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from './LoginScreen';
import { t } from '../../i18n';

const login = vi.fn();
vi.mock('../../firebase/auth', () => ({
  login: (...args: unknown[]) => login(...args),
}));

const renderScreen = () => {
  const onForgot = vi.fn();
  const onUseLocal = vi.fn();
  render(<LoginScreen onForgot={onForgot} onUseLocal={onUseLocal} />);
  return { onForgot, onUseLocal };
};

describe('LoginScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders title, hint, fields, submit, and link buttons', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: t.loginTitle })).toBeInTheDocument();
    expect(screen.getByText(t.loginHint)).toBeInTheDocument();
    expect(screen.getByLabelText(t.loginEmail)).toBeInTheDocument();
    expect(screen.getByLabelText(t.loginPassword)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.loginSubmit })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.loginForgot })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.loginUseLocal })).toBeInTheDocument();
  });

  it('shows email error and does not call login when email is empty', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(screen.getByText(t.authEmptyEmail)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows password error and does not call login when password is empty', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(screen.getByText(t.authEmptyPassword)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('calls login with email and password on submit', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(undefined);
    renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.type(screen.getByLabelText(t.loginPassword), 'pw');
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(login).toHaveBeenCalledWith('a@b.com', 'pw');
  });

  it('shows the error message when login rejects', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new Error('bad-credentials'));
    renderScreen();
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.type(screen.getByLabelText(t.loginPassword), 'pw');
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(await screen.findByText('bad-credentials')).toBeInTheDocument();
  });

  it('calls onForgot when the forgot link is clicked', async () => {
    const user = userEvent.setup();
    const { onForgot } = renderScreen();
    await user.click(screen.getByRole('button', { name: t.loginForgot }));
    expect(onForgot).toHaveBeenCalledTimes(1);
  });

  it('calls onUseLocal when the use-local link is clicked', async () => {
    const user = userEvent.setup();
    const { onUseLocal } = renderScreen();
    await user.click(screen.getByRole('button', { name: t.loginUseLocal }));
    expect(onUseLocal).toHaveBeenCalledTimes(1);
  });

  it('calls the injected login prop instead of the firebase login when provided', async () => {
    const user = userEvent.setup();
    const injectedLogin = vi.fn().mockResolvedValue(undefined);
    render(
      <LoginScreen
        onForgot={vi.fn()}
        onUseLocal={vi.fn()}
        login={injectedLogin}
      />
    );
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.type(screen.getByLabelText(t.loginPassword), 'pw');
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(injectedLogin).toHaveBeenCalledWith('a@b.com', 'pw');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the form error when the injected login prop rejects', async () => {
    const user = userEvent.setup();
    const injectedLogin = vi.fn().mockRejectedValue(new Error('bad-login'));
    render(
      <LoginScreen
        onForgot={vi.fn()}
        onUseLocal={vi.fn()}
        login={injectedLogin}
      />
    );
    await user.type(screen.getByLabelText(t.loginEmail), 'a@b.com');
    await user.type(screen.getByLabelText(t.loginPassword), 'pw');
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(await screen.findByText('bad-login')).toBeInTheDocument();
  });

  it('renders the forgot-password link when onForgot is given', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: t.loginForgot })).toBeInTheDocument();
  });

  it('omits the forgot-password link when onForgot is absent', () => {
    render(<LoginScreen onUseLocal={vi.fn()} />);
    expect(screen.queryByRole('button', { name: t.loginForgot })).not.toBeInTheDocument();
  });

  it('clears the email error when the user resumes typing email', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: t.loginSubmit }));
    expect(screen.getByText(t.authEmptyEmail)).toBeInTheDocument();
    await user.type(screen.getByLabelText(t.loginEmail), 'a');
    expect(screen.queryByText(t.authEmptyEmail)).not.toBeInTheDocument();
  });
});
