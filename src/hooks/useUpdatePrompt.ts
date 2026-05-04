import { useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface UpdatePromptState {
  needRefresh: boolean;
  applyUpdate: () => Promise<void>;
  dismiss: () => void;
}

// Bridges the vite-plugin-pwa autoUpdate flow to a UI prompt. With
// `registerType: 'autoUpdate'` Workbox installs a new SW silently, but the
// running tab keeps its old in-memory bundle until the user navigates. On
// Android the PWA is usually resumed from memory, so the user never sees
// the new version unless we ask them to reload.
export const useUpdatePrompt = (): UpdatePromptState => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      // Workbox calls this when a new SW is installed and waiting. We don't
      // need to do anything here — the [needRefresh] tuple already flips —
      // but declaring the option makes the registration explicit and
      // guarantees the listener is wired up.
    },
  });

  const applyUpdate = useCallback(async () => {
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  const dismiss = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return { needRefresh, applyUpdate, dismiss };
};
