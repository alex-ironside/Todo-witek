import { t } from '../../i18n';
import type { StorageMode } from '../../services/storageMode';
import SettingsGroup from './SettingsGroup';
import Segmented from './Segmented';

interface StorageGroupProps {
  mode: StorageMode;
  onChange: (mode: StorageMode) => void;
}

export default function StorageGroup({ mode, onChange }: StorageGroupProps) {
  return (
    <SettingsGroup title={t.storage}>
      <div className="flex items-center justify-end">
        <Segmented<StorageMode>
          value={mode}
          onChange={onChange}
          ariaLabel={t.modeGroupLabel}
          options={[
            { value: 'local', label: t.modeLocal },
            { value: 'firebase', label: t.modeCloud },
          ]}
        />
      </div>
    </SettingsGroup>
  );
}
