import { ACCENTS, ACCENT_KEYS, type AccentKey } from '../../theme/accents';
import { t } from '../../i18n';
import SettingsGroup from './SettingsGroup';

interface AppearanceGroupProps {
  accent: AccentKey;
  onChange: (key: AccentKey) => void;
}

// Inline `style` is the only non-Tailwind escape: Tailwind cannot generate
// arbitrary OKLCH backgrounds at runtime, and the 5 accent values are the
// single source of truth in `theme/accents.ts`.
export default function AppearanceGroup({ accent, onChange }: AppearanceGroupProps) {
  return (
    <SettingsGroup title={t.appearance}>
      <div className="flex items-center justify-between">
        <span className="text-text">{t.accentLabel}</span>
        <div className="flex gap-2">
          {ACCENT_KEYS.map((key) => {
            const active = key === accent;
            return (
              <button
                key={key}
                type="button"
                aria-label={ACCENTS[key].label}
                aria-pressed={active}
                onClick={() => onChange(key)}
                style={{ backgroundColor: ACCENTS[key].oklch }}
                className={`w-8 h-8 rounded-full transition-shadow ${
                  active
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-bgRaised'
                    : ''
                }`}
              />
            );
          })}
        </div>
      </div>
    </SettingsGroup>
  );
}
