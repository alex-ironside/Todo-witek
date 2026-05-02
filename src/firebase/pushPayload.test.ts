import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// Regression: sending an FCM `notification` payload makes the browser
// auto-display a notification AND fire `onBackgroundMessage` in the SW. When
// the SW also calls `showNotification`, the user sees TWO notifications for
// one reminder. Keep web push data-only so the SW is the single source of
// display.
describe('FCM data-only push contract', () => {
  describe('Cloud Function (functions/index.js)', () => {
    const fnSource = readFileSync(
      resolve(__dirname, '../../functions/index.js'),
      'utf8'
    );

    it('does not send a `notification` field in the FCM payload', () => {
      expect(fnSource).not.toMatch(/notification\s*:\s*\{/);
    });

    it('includes title and body inside the `data` payload', () => {
      expect(fnSource).toMatch(/data\s*:\s*\{[\s\S]*title/);
      expect(fnSource).toMatch(/data\s*:\s*\{[\s\S]*body/);
    });
  });

  describe('FCM service worker (public/firebase-messaging-sw.js)', () => {
    const swSource = readFileSync(
      resolve(__dirname, '../../public/firebase-messaging-sw.js'),
      'utf8'
    );

    it('reads title and body from payload.data, not payload.notification', () => {
      expect(swSource).toMatch(/payload\.data/);
      expect(swSource).toMatch(/\.title/);
      expect(swSource).toMatch(/\.body/);
      expect(swSource).not.toMatch(/payload\.notification/);
    });
  });
});
