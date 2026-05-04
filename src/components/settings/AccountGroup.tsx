import { t } from '../../i18n';
import SettingsGroup from './SettingsGroup';

interface AccountGroupProps {
  email: string | null;
  onSignOut: () => void;
}

// Account row inside the settings sheet. Hidden entirely in local mode
// (signaled by email === null) — there is no account to manage.
export default function AccountGroup({ email, onSignOut }: AccountGroupProps) {
  if (email === null) return null;
  return (
    <SettingsGroup>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-textDim text-sm">{t.signedInAs}</span>
          <span className="text-text truncate">{email}</span>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="text-danger text-sm font-medium px-2 py-1 -mr-2"
        >
          {t.signOut}
        </button>
      </div>
    </SettingsGroup>
  );
}
