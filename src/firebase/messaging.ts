import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';
import { getFirebaseApp } from './app';
import { vapidKey } from './config';
import type { Unsubscribe } from '../types';

// Cross-device push uses Firebase Cloud Messaging.
// The actual delivery requires a backend (e.g. a Cloud Function) that calls
// FCM with the device token saved against the user. See functions/ for a stub.

let _messaging: Messaging | null | undefined;

export const getMessagingIfSupported = async (): Promise<Messaging | null> => {
  if (_messaging !== undefined) return _messaging;
  _messaging = (await isSupported()) ? getMessaging(getFirebaseApp()) : null;
  return _messaging;
};

export const getFcmToken = async (
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<string | null> => {
  const messaging = await getMessagingIfSupported();
  if (!messaging || !vapidKey) return null;
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
};

export const onForegroundMessage = async (
  handler: (payload: MessagePayload) => void
): Promise<Unsubscribe> => {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
};
