import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { firebaseConfig, vapidKey } from './config';

// Regression: shipping with vapidKey='' silently disables push. usePushNotifications
// flips to 'unconfigured' and PushToggle renders null — users see no button, never
// register a token, cron sends 0 pushes. Lock both the runtime config and the
// firebase-messaging-sw.js mirror so the deployed bundle can actually push.
describe('firebase config', () => {
  it('vapidKey is set so getFcmToken can mint tokens', () => {
    expect(vapidKey).toBeTruthy();
    expect(vapidKey.length).toBeGreaterThan(20);
  });

  it('firebaseConfig has the fields needed by the FCM background SW', () => {
    expect(firebaseConfig.apiKey).toBeTruthy();
    expect(firebaseConfig.projectId).toBeTruthy();
    expect(firebaseConfig.messagingSenderId).toBeTruthy();
    expect(firebaseConfig.appId).toBeTruthy();
  });
});

describe('public/firebase-messaging-sw.js', () => {
  const swSource = readFileSync(
    resolve(__dirname, '../../public/firebase-messaging-sw.js'),
    'utf8'
  );

  // Pull the value of a key from the inline firebase.initializeApp({...}) block.
  const readSwField = (key: string): string => {
    const re = new RegExp(`${key}:\\s*['"\`]([^'"\`]*)['"\`]`);
    const m = swSource.match(re);
    return m ? m[1] : '';
  };

  it('apiKey matches the runtime config (background SW must initialize)', () => {
    expect(readSwField('apiKey')).toBe(firebaseConfig.apiKey);
  });

  it('projectId matches the runtime config', () => {
    expect(readSwField('projectId')).toBe(firebaseConfig.projectId);
  });

  it('messagingSenderId matches the runtime config', () => {
    expect(readSwField('messagingSenderId')).toBe(firebaseConfig.messagingSenderId);
  });

  it('appId matches the runtime config', () => {
    expect(readSwField('appId')).toBe(firebaseConfig.appId);
  });
});
