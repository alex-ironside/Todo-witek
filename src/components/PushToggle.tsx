import type { PushStatus } from '../hooks/usePushNotifications';

interface PushToggleProps {
  status: PushStatus;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export default function PushToggle({ status, enable, disable }: PushToggleProps) {
  if (status === 'unconfigured' || status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <p className="muted">Notifications blocked — enable in browser settings</p>
    );
  }

  const isEnabled = status === 'enabled';
  const isLoading = status === 'requesting' || status === 'registering';

  return (
    <div>
      <button
        disabled={isLoading}
        onClick={isEnabled ? disable : enable}
      >
        {isEnabled ? 'Disable push' : 'Enable push'}
      </button>
      <p className="muted">
        {isEnabled ? 'Push enabled on this device' : 'Push not enabled'}
      </p>
    </div>
  );
}
