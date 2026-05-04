import { useUpdatePrompt } from '../hooks/useUpdatePrompt';
import { t } from '../i18n';

// Surfaces the SW "new version waiting" state as a UI prompt. Without this,
// vite-plugin-pwa's autoUpdate strategy installs new bundles silently and
// the running tab keeps its stale in-memory JS until the user happens to
// trigger a full navigation — which on Android PWAs almost never happens.
export default function UpdatePrompt() {
  const { needRefresh, applyUpdate, dismiss } = useUpdatePrompt();
  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-2 bottom-2 z-50 rounded-xl bg-bg border border-hairlineSoft shadow-lg p-3 flex items-center gap-3"
    >
      <span className="flex-1 text-text text-sm">{t.updateAvailable}</span>
      <button
        type="button"
        onClick={() => { void applyUpdate(); }}
        className="h-9 px-3 rounded-lg bg-accent text-onAccent text-sm font-medium"
      >
        {t.updateApply}
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="h-9 px-2 rounded-lg text-textMuted text-sm"
      >
        {t.updateDismiss}
      </button>
    </div>
  );
}
