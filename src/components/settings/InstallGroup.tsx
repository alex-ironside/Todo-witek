import { t } from '../../i18n';
import SettingsGroup from './SettingsGroup';

interface InstallGroupProps {
  canInstall: boolean;
  onInstall: () => void;
}

// Install row. `usePwaInstall().canInstall` already returns false once the
// app is installed (per Phase 1 hook), so a single boolean gates render.
export default function InstallGroup({ canInstall, onInstall }: InstallGroupProps) {
  if (!canInstall) return null;
  return (
    <SettingsGroup>
      <button
        type="button"
        onClick={onInstall}
        className="flex items-center justify-between w-full text-left gap-3"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-text">{t.installTitle}</span>
          <span className="text-textDim text-sm">{t.installHelper}</span>
        </div>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-textMute flex-shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </SettingsGroup>
  );
}
