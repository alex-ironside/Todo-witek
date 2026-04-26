import type { StorageMode } from '../services/storageMode';
import { t } from '../i18n';

interface Props {
  mode: StorageMode;
  onChange: (mode: StorageMode) => void;
}

export default function StorageModeToggle({ mode, onChange }: Props) {
  return (
    <div className="row" role="group" aria-label={t.modeGroupLabel}>
      <button
        type="button"
        className={mode === 'local' ? 'primary' : 'ghost'}
        onClick={() => onChange('local')}
        aria-pressed={mode === 'local'}
      >
        {t.modeLocal}
      </button>
      <button
        type="button"
        className={mode === 'firebase' ? 'primary' : 'ghost'}
        onClick={() => onChange('firebase')}
        aria-pressed={mode === 'firebase'}
      >
        {t.modeCloud}
      </button>
    </div>
  );
}
