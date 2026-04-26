# Todo Witek

Todo PWA backed by Firebase. React + Vite, deploys to GitHub Pages.

## Features

- Email/password login (no public sign-up).
- CRUD todos, mark done/undone.
- Multiple reminders per todo with browser push notifications.
- Offline-first: Firestore IndexedDB cache means reads come from disk and
  writes are queued and synced when you're back online.
- Installable PWA (manifest + Workbox precache).

## Stack

- React 18 + Vite
- Firebase: Auth, Firestore (with `persistentLocalCache`), Cloud Messaging
- `vite-plugin-pwa` (Workbox) for the app shell SW
- Vitest + React Testing Library

## First-time setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a Firebase project** at https://console.firebase.google.com
   - Enable **Authentication** → Email/Password sign-in.
   - Add the user(s) you want via the Firebase console (no UI signup is exposed).
   - Enable **Cloud Firestore** in production mode.
   - (For push) Enable **Cloud Messaging** and generate a Web Push certificate.

3. **Fill in your Firebase config**
   - `src/firebase/config.ts` — paste the web SDK config object and the VAPID key.
   - `public/firebase-messaging-sw.js` — paste the same `firebaseConfig`
     (it can't be imported from JS at build time because the SW is loaded
     directly by the browser).

4. **Deploy Firestore rules**
   ```
   firebase deploy --only firestore:rules
   ```
   The included `firestore.rules` only allows users to read/write their own
   todos.

5. **Run locally**
   ```
   npm run dev
   ```

6. **Run tests**
   ```
   npm test
   ```

## Deploy to GitHub Pages

The included `.github/workflows/deploy.yml` builds on push to `main` and
publishes `dist/` to GitHub Pages. The workflow sets `VITE_BASE` to
`/<repo-name>/` so asset paths line up.

To enable Pages: Repo → Settings → Pages → Source = "GitHub Actions".

## Push notifications (cross-device)

In-app reminders work out of the box (the React app schedules them via
`setTimeout` and shows them via the Notification API).

For pushes that fire when the app is **closed**, deploy the Cloud Function
stub in `functions/index.js`:

```
cd functions
npm install
firebase deploy --only functions
```

It runs every minute, finds reminders whose `remindAt` is in the past,
sends FCM to the user's saved device tokens, and marks them fired.
Users opt in by clicking "Enable cross-device push" in the app.

## Architecture

```
src/
  types.ts             ← domain types (Todo, Reminder, ...)
  firebase/
    config.ts          ← user-supplied keys
    app.ts             ← single Firebase app + Firestore (offline cache)
    auth.ts            ← login/logout/observe
    todos.ts           ← Firestore CRUD for todos
    messaging.ts       ← FCM init/getToken
    pushTokens.ts      ← saves device token under user
  hooks/
    useAuth.ts         ← subscribe to auth state
    useTodos.ts        ← subscribe to user's todos
    useOnlineStatus.ts ← navigator.onLine wrapper
  services/
    reminderScheduler.ts ← schedules in-app notifications
    notificationService.ts ← Notification API wrapper
  components/          ← Login, TodoForm, TodoList, TodoItem, ReminderEditor
  utils/dateUtils.ts   ← pure helpers
public/
  firebase-messaging-sw.js ← FCM background handler
functions/             ← optional Cloud Function for cross-device push
```

Each Firebase wrapper has a small, stable surface so the rest of the app
depends on the wrapper, not the SDK directly. Pure logic
(`reminderScheduler`, `dateUtils`) is unit tested without mocking Firebase.
