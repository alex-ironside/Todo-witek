import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushToggle from './PushToggle';
import type { PushStatus } from '../hooks/usePushNotifications';

const makeProps = (status: PushStatus) => ({
  status,
  enable: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
});

describe('PushToggle', () => {
  it('renders nothing when status is unconfigured', () => {
    const { container } = render(<PushToggle {...makeProps('unconfigured')} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when status is unsupported', () => {
    const { container } = render(<PushToggle {...makeProps('unsupported')} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders blocked message when status is denied', () => {
    render(<PushToggle {...makeProps('denied')} />);
    expect(screen.getByText(/Notifications blocked/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders Push enabled on this device label when status is enabled', () => {
    render(<PushToggle {...makeProps('enabled')} />);
    expect(screen.getByText(/Push enabled on this device/)).toBeInTheDocument();
  });

  it('renders Push not enabled label when status is idle', () => {
    render(<PushToggle {...makeProps('idle')} />);
    expect(screen.getByText(/Push not enabled/)).toBeInTheDocument();
  });

  it('renders Push not enabled label when status is disabled', () => {
    render(<PushToggle {...makeProps('disabled')} />);
    expect(screen.getByText(/Push not enabled/)).toBeInTheDocument();
  });

  it('calls enable() when Enable push button is clicked', async () => {
    const props = makeProps('idle');
    render(<PushToggle {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /enable/i }));
    expect(props.enable).toHaveBeenCalledOnce();
  });

  it('calls disable() when Disable push button is clicked', async () => {
    const props = makeProps('enabled');
    render(<PushToggle {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /disable/i }));
    expect(props.disable).toHaveBeenCalledOnce();
  });
});
