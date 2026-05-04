import { t } from '../../i18n';

// Quiet centered empty state for the active category. Shown when no
// open todos exist (independent of the done section's content).
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center mt-32 gap-2 px-4 text-center">
      <p className="text-textDim text-base">{t.empty}</p>
      <p className="text-textMute text-sm">{t.emptyHint}</p>
    </div>
  );
}
