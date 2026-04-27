import { useCallback, useEffect, useState } from 'react';
import { vapidKey } from '../firebase/config';
import {
  registerCurrentDeviceForPush,
  unregisterDeviceToken,
  getCurrentDeviceToken,
} from '../firebase/pushTokens';
import { onForegroundMessage } from '../firebase/messaging';
import { requestNotificationPermission } from '../services/notificationService';

export type PushStatus =
  | 'unsupported'   // Notification API not available in this browser
  | 'unconfigured'  // vapidKey is empty — push not set up for this deployment
  | 'idle'          // permission === 'default', user hasn't decided
  | 'requesting'    // permission prompt is open
  | 'denied'        // permission === 'denied'
  | 'registering'   // permission granted, Firestore write in flight
  | 'enabled'       // token saved in Firestore; push active on this device
  | 'disabled'      // user opted out (token deleted); permission still granted
  | 'error';        // last operation failed

export interface PushState {
  status: PushStatus;
  token: string | null;
  errorMessage: string | null;
  bannerMessage: string | null;
  dismissBanner: () => void;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export const usePushNotifications = (userId: string): PushState => {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Mount effect: Firestore-based status check
  useEffect(() => {
    if (!vapidKey) { setStatus('unconfigured'); return; }
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    const perm = Notification.permission;
    if (perm === 'denied') { setStatus('denied'); return; }
    if (perm === 'granted') {
      getCurrentDeviceToken(userId).then((t) => {
        if (t) { setStatus('enabled'); setToken(t); }
        else { setStatus('idle'); }
      });
    }
  }, [userId]);

  // Foreground message subscription with cancellation guard (StrictMode-safe)
  useEffect(() => {
    let unsub: () => void = () => {};
    let cancelled = false;
    onForegroundMessage((payload) => {
      setBannerMessage(payload.notification?.title ?? 'New notification');
    }).then((off) => {
      if (cancelled) { off(); } else { unsub = off; }
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  // Banner 5-second auto-dismiss
  useEffect(() => {
    if (!bannerMessage) return;
    const id = setTimeout(() => setBannerMessage(null), 5000);
    return () => clearTimeout(id);
  }, [bannerMessage]);

  const enable = useCallback(async () => {
    setStatus('requesting');
    const permission = await requestNotificationPermission();
    if (permission === 'denied') { setStatus('denied'); return; }
    if (permission !== 'granted') { return; }
    setStatus('registering');
    try {
      const t = await registerCurrentDeviceForPush(userId);
      if (t) { setToken(t); setStatus('enabled'); }
      else { setStatus('error'); setErrorMessage('Could not get FCM token'); }
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : String(e));
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!token) return;
    await unregisterDeviceToken(token);
    setToken(null);
    setStatus('disabled');
  }, [token]);

  const dismissBanner = useCallback(() => setBannerMessage(null), []);

  return { status, token, errorMessage, bannerMessage, dismissBanner, enable, disable };
};
