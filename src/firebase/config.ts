import type { FirebaseOptions } from 'firebase/app';

// Fill these in with values from your Firebase project console.
// Settings → Project settings → General → Your apps → SDK setup and configuration.
//
// vapidKey: Project settings → Cloud Messaging → Web configuration → Web Push certificates.
// You only need vapidKey if you want FCM push notifications.

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q",
  authDomain: "todo-witek-6a21e.firebaseapp.com",
  projectId: "todo-witek-6a21e",
  storageBucket: "todo-witek-6a21e.firebasestorage.app",
  messagingSenderId: "1076835553082",
  appId: "1:1076835553082:web:d45fc915d2f55358bb4a03",
  measurementId: "G-DZJ28NFYE9"
};

export const vapidKey = 'BKTkdV9M8R0XyOT3jkI9G9_HKxhz-g4gNEyNCJt_BmTdT0EmhIOozkhh1CvWVo4F3Z_6YXmPQDsA-R7w5qdT5jU';

export const isConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
