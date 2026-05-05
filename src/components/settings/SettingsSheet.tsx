import { t } from '../../i18n';
import type { PushState } from '../../hooks/usePushNotifications';
import type { StorageMode } from '../../services/storageMode';
import type { AccentKey } from '../../theme/accents';
import Sheet from '../main-list/Sheet';
import AccountGroup from './AccountGroup';
import AppearanceGroup from './AppearanceGroup';
import StorageGroup from './StorageGroup';
import TransferGroup from './TransferGroup';
import PushGroup from './PushGroup';
import InstallGroup from './InstallGroup';

export interface TransferState {
  localCount: number;
  busy: boolean;
  message: string | null;
  onTransfer: () => void;
}

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  email: string | null;
  onSignOut: () => void;
  accent: AccentKey;
  onAccentChange: (key: AccentKey) => void;
  mode: StorageMode;
  onModeChange: (mode: StorageMode) => void;
  transfer: TransferState | null;
  push: PushState | null;
  canInstall: boolean;
  onInstall: () => void;
}

// Composer that wires every settings group into the shared Sheet primitive.
// Owns no state — all interaction state lives in MainList (or higher).
export default function SettingsSheet(props: SettingsSheetProps) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={t.settings}>
      <div className="space-y-4">
        <AccountGroup email={props.email} onSignOut={props.onSignOut} />
        <AppearanceGroup accent={props.accent} onChange={props.onAccentChange} />
        <StorageGroup mode={props.mode} onChange={props.onModeChange} />
        {props.transfer && (
          <TransferGroup
            localCount={props.transfer.localCount}
            busy={props.transfer.busy}
            message={props.transfer.message}
            onTransfer={props.transfer.onTransfer}
          />
        )}
        <PushGroup push={props.push} />
        <InstallGroup canInstall={props.canInstall} onInstall={props.onInstall} />
      </div>
    </Sheet>
  );
}
