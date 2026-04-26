import type { FirebaseOptions } from 'firebase/app';

// Fill these in with values from your Firebase project console.
// Settings → Project settings → General → Your apps → SDK setup and configuration.
//
// vapidKey: Project settings → Cloud Messaging → Web configuration → Web Push certificates.
// You only need vapidKey if you want FCM push notifications.

export const firebaseConfig: FirebaseOptions = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const vapidKey = '';

export const isConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
