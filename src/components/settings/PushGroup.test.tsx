import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PushGroup from './PushGroup';
import type { PushState, PushStatus } from '../../hooks/usePushNotifications';

const makePush = (status: PushStatus): PushState => ({
  status,
  token: status === 'enabled' ? 'tok' : null,
  errorMessage: null,
  bannerMessage: null,
  dismissBanner: vi.fn(),
  enable: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
});

describe('PushGroup', () => {
  it('returns null when push is null', () => {
    const { container } = render(<PushGroup push={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when status is unconfigured', () => {
    const { container } = render(<PushGroup push={makePush('unconfigured')} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when status is unsupported', () => {
    const { container } = render(<PushGroup push={makePush('unsupported')} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title, helper, and Wyłączone status when not enabled', () => {
    const { getByText } = render(<PushGroup push={makePush('idle')} />);
    expect(getByText('Powiadomienia push')).toBeInTheDocument();
    expect(getByText('Przypomnienia działają, gdy aplikacja jest zamknięta.')).toBeInTheDocument();
    expect(getByText('Wyłączone')).toBeInTheDocument();
  });

  it('renders Włączone when enabled, switch is on', () => {
    const push = makePush('enabled');
    const { getByText, getByRole } = render(<PushGroup push={push} />);
    expect(getByText('Włączone')).toBeInTheDocument();
    expect(getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('toggling on calls push.enable', () => {
    const push = makePush('idle');
    const { getByRole } = render(<PushGroup push={push} />);
    fireEvent.click(getByRole('switch'));
    expect(push.enable).toHaveBeenCalled();
  });

  it('toggling off calls push.disable', () => {
    const push = makePush('enabled');
    const { getByRole } = render(<PushGroup push={push} />);
    fireEvent.click(getByRole('switch'));
    expect(push.disable).toHaveBeenCalled();
  });
});
