import { collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getDb } from './app';
import { getFcmToken } from './messaging';

const COL = 'fcmTokens';

// Distinct sub-scope for the FCM SW so it does not collide with the
// vite-plugin-pwa workbox SW registered at BASE_URL. Without this, both
// service workers claim the same scope and getToken attaches the FCM
// push subscription to the workbox SW, which has no FCM handler.
const FCM_SW_SCOPE_SUFFIX = 'firebase-cloud-messaging-push-scope';

let _fcmSwRegistration: Promise<ServiceWorkerRegistration> | null = null;

const getFcmServiceWorker = (): Promise<ServiceWorkerRegistration> => {
  if (_fcmSwRegistration) return _fcmSwRegistration;
  const base = import.meta.env.BASE_URL || '/';
  const swUrl = `${base}firebase-messaging-sw.js`;
  const scope = `${base}${FCM_SW_SCOPE_SUFFIX}`;
  _fcmSwRegistration = navigator.serviceWorker
    .getRegistration(scope)
    .then((existing) =>
      existing ?? navigator.serviceWorker.register(swUrl, { scope })
    );
  return _fcmSwRegistration;
};

// Saves the device's FCM token under the signed-in user.
// A backend (Cloud Function) reads these to push reminders cross-device.
export const registerCurrentDeviceForPush = async (
  userId: string
): Promise<string | null> => {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await getFcmServiceWorker();
  const token = await getFcmToken(registration);
  if (!token) return null;
  await setDoc(doc(collection(getDb(), COL), token), {
    userId,
    token,
    createdAt: Date.now(),
  });
  return token;
};

export const unregisterDeviceToken = async (token: string): Promise<void> => {
  await deleteDoc(doc(getDb(), COL, token));
};

export const getCurrentDeviceToken = async (userId: string): Promise<string | null> => {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await getFcmServiceWorker();
  const token = await getFcmToken(registration);
  if (!token) return null;
  const snap = await getDoc(doc(collection(getDb(), COL), token));
  if (snap.exists() && (snap.data() as { userId: string }).userId === userId) {
    return token;
  }
  return null;
};
