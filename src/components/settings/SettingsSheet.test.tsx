import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SettingsSheet from './SettingsSheet';
import type { PushState } from '../../hooks/usePushNotifications';

const makePush = (): PushState => ({
  status: 'enabled',
  token: 'tok',
  errorMessage: null,
  bannerMessage: null,
  dismissBanner: vi.fn(),
  enable: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
});

const baseProps = {
  open: true,
  onClose: () => {},
  email: null as string | null,
  onSignOut: () => {},
  accent: 'amber' as const,
  onAccentChange: () => {},
  mode: 'local' as const,
  onModeChange: () => {},
  transfer: null,
  push: null as PushState | null,
  canInstall: false,
  onInstall: () => {},
};

describe('SettingsSheet', () => {
  it('renders Sheet titled Ustawienia when open', () => {
    const { getByRole } = render(<SettingsSheet {...baseProps} />);
    const dialog = getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Ustawienia');
    expect(dialog.className).toContain('translate-y-0');
  });

  it('hidden (translate-y-full) when open=false', () => {
    const { getByRole } = render(<SettingsSheet {...baseProps} open={false} />);
    expect(getByRole('dialog').className).toContain('translate-y-full');
  });

  it('AccountGroup hidden when email is null', () => {
    const { queryByText } = render(<SettingsSheet {...baseProps} email={null} />);
    expect(queryByText('Zalogowany jako')).toBeNull();
  });

  it('AccountGroup visible when email set', () => {
    const { getByText } = render(
      <SettingsSheet {...baseProps} email="x@y.com" />
    );
    expect(getByText('Zalogowany jako')).toBeInTheDocument();
    expect(getByText('x@y.com')).toBeInTheDocument();
  });

  it('PushGroup hidden when push is null', () => {
    const { queryByText } = render(<SettingsSheet {...baseProps} push={null} />);
    expect(queryByText('Powiadomienia push')).toBeNull();
  });

  it('PushGroup visible when push provided with valid status', () => {
    const { getByText } = render(
      <SettingsSheet {...baseProps} push={makePush()} />
    );
    expect(getByText('Powiadomienia push')).toBeInTheDocument();
  });

  it('AppearanceGroup and StorageGroup always rendered', () => {
    const { getByText } = render(<SettingsSheet {...baseProps} />);
    expect(getByText('Wygląd')).toBeInTheDocument();
    expect(getByText('Przechowywanie')).toBeInTheDocument();
  });

  it('TransferGroup hidden when transfer prop is null', () => {
    const { queryByText } = render(<SettingsSheet {...baseProps} />);
    expect(queryByText('Przenieś z urządzenia')).toBeNull();
  });

  it('TransferGroup visible when transfer prop has localCount > 0', () => {
    const { getByText } = render(
      <SettingsSheet
        {...baseProps}
        transfer={{
          localCount: 2,
          busy: false,
          message: null,
          onTransfer: () => {},
        }}
      />
    );
    expect(getByText('Przenieś z urządzenia')).toBeInTheDocument();
  });

  it('InstallGroup hidden when canInstall=false, visible when true', () => {
    const { queryByText, rerender } = render(<SettingsSheet {...baseProps} />);
    expect(queryByText('Zainstaluj aplikację')).toBeNull();
    rerender(<SettingsSheet {...baseProps} canInstall={true} />);
    expect(queryByText('Zainstaluj aplikację')).not.toBeNull();
  });
});
