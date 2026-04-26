import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from 'firebase/messaging';
import { getFirebaseApp } from './app.js';
import { vapidKey } from './config.js';

// Cross-device push uses Firebase Cloud Messaging.
// The actual delivery requires a backend (e.g. a Cloud Function) that calls
// FCM with the device token saved against the user. See functions/ for a stub.

let _messaging;

export const getMessagingIfSupported = async () => {
  if (_messaging !== undefined) return _messaging;
  _messaging = (await isSupported()) ? getMessaging(getFirebaseApp()) : null;
  return _messaging;
};

export const getFcmToken = async (serviceWorkerRegistration) => {
  const messaging = await getMessagingIfSupported();
  if (!messaging || !vapidKey) return null;
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
};

export const onForegroundMessage = async (handler) => {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
};
