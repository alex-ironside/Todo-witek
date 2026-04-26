import { useCallback, useEffect, useState } from 'react';

// Browser-defined event for PWA install prompt. Not in TS lib.dom yet,
// so we declare the minimal shape we need.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaInstallState {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

export const usePwaInstall = (): PwaInstallState => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setEvent(null);
    }
  }, [event]);

  return {
    canInstall: Boolean(event) && !installed,
    promptInstall,
  };
};
