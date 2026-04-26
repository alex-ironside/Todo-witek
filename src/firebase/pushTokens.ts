import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from './app';
import { getFcmToken } from './messaging';

const COL = 'fcmTokens';

// Saves the device's FCM token under the signed-in user.
// A backend (Cloud Function) reads these to push reminders cross-device.
export const registerCurrentDeviceForPush = async (
  userId: string
): Promise<string | null> => {
  if (!('serviceWorker' in navigator)) return null;
  const swUrl = `${import.meta.env.BASE_URL || '/'}firebase-messaging-sw.js`;
  const registration = await navigator.serviceWorker.register(swUrl, {
    scope: import.meta.env.BASE_URL || '/',
  });
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
