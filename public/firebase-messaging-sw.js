/* global importScripts, firebase */
// FCM service worker. Must live at a stable path under the site origin
// (Firebase looks for /firebase-messaging-sw.js by default).
//
// Fill in firebaseConfig below to match src/firebase/config.js.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Keep these in sync with src/firebase/config.ts — the SW runs in a separate
// context and cannot import the TS module. config.test.ts asserts they match.
firebase.initializeApp({
  apiKey: 'AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q',
  authDomain: 'todo-witek-6a21e.firebaseapp.com',
  projectId: 'todo-witek-6a21e',
  storageBucket: 'todo-witek-6a21e.firebasestorage.app',
  messagingSenderId: '1076835553082',
  appId: '1:1076835553082:web:d45fc915d2f55358bb4a03',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Reminder';
  const options = {
    body: payload.notification?.body || '',
    data: payload.data || {},
    icon: '/icon-192.png',
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      const target = wins[0];
      if (target) return target.focus();
      return clients.openWindow('/');
    })
  );
});
