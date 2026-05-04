import { t } from '../../i18n';
import type { PushState } from '../../hooks/usePushNotifications';
import SettingsGroup from './SettingsGroup';
import Switch from './Switch';

interface PushGroupProps {
  push: PushState | null;
}

// Push group hides on inert states (no push at all, missing config, or
// browser unsupported). All other states render the switch so the user
// can interact — Phase 1 toggle behavior is preserved.
export default function PushGroup({ push }: PushGroupProps) {
  if (!push) return null;
  if (push.status === 'unconfigured' || push.status === 'unsupported') return null;

  const isOn = push.status === 'enabled';

  return (
    <SettingsGroup>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-text">{t.pushTitle}</span>
          <Switch
            checked={isOn}
            ariaLabel={t.pushTitle}
            onChange={(next) => {
              void (next ? push.enable() : push.disable());
            }}
          />
        </div>
        <span className="text-textDim text-sm">{t.pushHelper}</span>
        <span className="text-textMute text-xs">
          {isOn ? t.pushOn : t.pushOff}
        </span>
      </div>
    </SettingsGroup>
  );
}
