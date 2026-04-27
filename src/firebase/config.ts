import type { FirebaseOptions } from 'firebase/app';

// Fill these in with values from your Firebase project console.
// Settings → Project settings → General → Your apps → SDK setup and configuration.
//
// vapidKey: Project settings → Cloud Messaging → Web configuration → Web Push certificates.
// You only need vapidKey if you want FCM push notifications.

export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyAlUGu40gQ9vqe5CMxAvMEyZXdCJ-zgUn4',
  authDomain: 'todo-witek.firebaseapp.com',
  projectId: 'todo-witek',
  storageBucket: 'todo-witek.firebasestorage.app',
  messagingSenderId: '753171069994',
  appId: '1:753171069994:web:15d897dc95a7bb1f11d753',
  measurementId: 'G-QERCKMDPDH',
};

export const vapidKey = '';

export const isConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
