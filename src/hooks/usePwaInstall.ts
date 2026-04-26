import { useCallback, useEffect, useState } from 'react';

// Browser-defined event for PWA install prompt. Not in TS lib.dom yet,
// so we declare the minimal shape we need.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaInstallState {
  // Should the InstallButton render at all?
  canInstall: boolean;
  // Triggers the native prompt (Chromium/Edge). On iOS this is a no-op —
  // the consumer should show its own instructions instead.
  promptInstall: () => Promise<void>;
  // True on iPhone/iPad Safari, where Apple has no programmatic install API.
  isIos: boolean;
}

const detectIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as Mac with touch.
  return (
    ua.includes('Mac') &&
    typeof document !== 'undefined' &&
    'ontouchend' in document
  );
};

const detectStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as { standalone?: boolean }).standalone;
  if (iosStandalone) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
};

export const usePwaInstall = (): PwaInstallState => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => detectStandalone());
  const [isIos] = useState(() => detectIos());

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

  // iOS: show button until the app is installed (Safari has no event to
  // detect that, so we rely on display-mode/standalone). Other browsers:
  // show only when we have the captured prompt event.
  const canInstall = !installed && (isIos || Boolean(event));

  return { canInstall, promptInstall, isIos };
};
