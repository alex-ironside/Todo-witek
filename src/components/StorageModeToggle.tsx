import type { StorageMode } from '../services/storageMode';

interface Props {
  mode: StorageMode;
  onChange: (mode: StorageMode) => void;
}

export default function StorageModeToggle({ mode, onChange }: Props) {
  return (
    <div className="row" role="group" aria-label="Storage mode">
      <button
        type="button"
        className={mode === 'local' ? 'primary' : 'ghost'}
        onClick={() => onChange('local')}
        aria-pressed={mode === 'local'}
      >
        Local
      </button>
      <button
        type="button"
        className={mode === 'firebase' ? 'primary' : 'ghost'}
        onClick={() => onChange('firebase')}
        aria-pressed={mode === 'firebase'}
      >
        Cloud
      </button>
    </div>
  );
}
