# Phase 1: Push Notifications Setup - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full push notification support for the Firebase-mode app: FCM token registration on explicit user action, permission request UI with feedback, Firestore token storage, foreground message handling via in-app banner, and per-device opt-in/opt-out toggle. Local-mode is unaffected.

</domain>

<decisions>
## Implementation Decisions

### Permission Request UX
- Request notification permission on button click only — not automatically on login
- When permission is denied, show muted message: "Notifications blocked — enable in browser settings"
- Two-step flow: request browser permission first, then register FCM token (cleaner, separates concerns)

### Opt-in / Opt-out UI
- Single toggle control that shows current status (enabled/disabled on this device)
- On opt-out: call `unregisterDeviceToken` to delete FCM token from Firestore — stops push to this device
- Always show current push status ("Push enabled on this device" / "Push not enabled") regardless of toggle state

### Foreground Message Handling
- Display foreground push messages as an in-app dismissible banner (reuses existing `.banner.warn` style)
- Banner auto-dismisses after 5 seconds
- Wire up `onForegroundMessage` in a new `usePushNotifications` hook called from `FirebaseAuthenticated`

### Claude's Discretion
- Tests for `messaging.ts` and `pushTokens.ts` (currently untested)
- SW config sync: build-time Vite plugin or `vite.config.ts` script to inject firebase config values into `public/firebase-messaging-sw.js` — current placeholder has empty strings

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/firebase/messaging.ts` — `getMessagingIfSupported`, `getFcmToken`, `onForegroundMessage` (all implemented, none tested)
- `src/firebase/pushTokens.ts` — `registerCurrentDeviceForPush`, `unregisterDeviceToken` (implemented, not tested)
- `src/services/notificationService.ts` — `requestNotificationPermission`, `showLocalNotification`
- `.banner.warn` CSS class — used by offline banner in App.tsx, reusable for foreground messages
- `src/types.ts` — `Unsubscribe` type

### Established Patterns
- Hooks in `src/hooks/` are single-responsibility (`useAuth`, `useTodos`, `useOnlineStatus`)
- Firebase wrappers in `src/firebase/` are the only place that imports `firebase/*`
- Components receive narrow prop types; no god context
- `vi.useFakeTimers()` for time-dependent tests
- Mock `firebase/*` at module boundary in tests (see `todos.test.ts` pattern)

### Integration Points
- `FirebaseAuthenticated` in App.tsx — render `usePushNotifications` hook here; replace current inline push button with a `PushToggle` component
- `vapidKey` from `src/firebase/config.ts` — already imported in App.tsx; guard rendering on it
- `public/firebase-messaging-sw.js` — needs config values injected at build time

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches within the established patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
