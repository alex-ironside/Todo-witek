import { t } from '../../i18n';
import SettingsGroup from './SettingsGroup';

interface TransferGroupProps {
  localCount: number;
  busy: boolean;
  message: string | null;
  onTransfer: () => void;
}

// Migrate todos saved on this device to the active cloud account. Hidden
// when there is nothing to transfer and no completion message — mirrors
// the inert-state pattern used by InstallGroup/PushGroup.
export default function TransferGroup({
  localCount,
  busy,
  message,
  onTransfer,
}: TransferGroupProps) {
  if (localCount === 0 && !message) return null;
  const label = busy ? t.transferBusy : t.transferAction(localCount);
  return (
    <SettingsGroup title={t.transferTitle}>
      <div className="flex flex-col gap-2">
        <span className="text-textDim text-sm">{t.transferHelper}</span>
        {localCount > 0 && (
          <button
            type="button"
            onClick={onTransfer}
            disabled={busy}
            className="bg-accent text-accentInk rounded-field px-4 h-11 font-semibold disabled:opacity-50 self-start"
          >
            {label}
          </button>
        )}
        {message && <span className="text-textMute text-xs">{message}</span>}
      </div>
    </SettingsGroup>
  );
}
