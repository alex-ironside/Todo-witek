import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AccountGroup from './AccountGroup';

describe('AccountGroup', () => {
  it('returns null when email is null', () => {
    const { container } = render(
      <AccountGroup email={null} onSignOut={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Zalogowany jako + email + Wyloguj button', () => {
    const { getByText } = render(
      <AccountGroup email="user@example.com" onSignOut={() => {}} />
    );
    expect(getByText('Zalogowany jako')).toBeInTheDocument();
    expect(getByText('user@example.com')).toBeInTheDocument();
    expect(getByText('Wyloguj')).toBeInTheDocument();
  });

  it('Wyloguj is text-danger', () => {
    const { getByText } = render(
      <AccountGroup email="x@y" onSignOut={() => {}} />
    );
    expect(getByText('Wyloguj').className).toContain('text-danger');
  });

  it('clicking Wyloguj calls onSignOut', () => {
    const onSignOut = vi.fn();
    const { getByText } = render(
      <AccountGroup email="x@y" onSignOut={onSignOut} />
    );
    fireEvent.click(getByText('Wyloguj'));
    expect(onSignOut).toHaveBeenCalled();
  });
});
