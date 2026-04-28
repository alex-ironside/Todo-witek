---
slug: data-is-not-synched
status: root_cause_found
trigger: data is not synched. compare http://localhost:5173/todo-witek/ to https://alex-ironside.github.io/Todo-witek/ with same creds in cloud view using playwright. push to master/main on fix, wait 2 mins and check again. it's on gh pages. u can also use gh to read the status of action.
created: 2026-04-27
updated: 2026-04-27
---

## Symptoms

- **Expected:** Same todo data visible on both local (localhost:5173/todo-witek/) and production (alex-ironside.github.io/Todo-witek/) when signed in with the same credentials
- **Actual:** Data does not match between local and production — both show "Ładowanie…" (Loading…) indefinitely in Chmura (Firebase) mode
- **Errors:** No console errors in browser (SDK swallows the error as "offline mode"); raw SDK error in Node: `PERMISSION_DENIED: Cloud Firestore API has not been used in project todo-witek-6a21e before or it is disabled`
- **Timeline:** First time tested — issue has always existed
- **Reproduction:** Log in with same credentials on both environments → both stuck on Loading in cloud mode

## Current Focus

- hypothesis: CONFIRMED — Firestore API is disabled at the Google Cloud project level
- test: Firebase JS SDK `onSnapshot` in Node (no persistent cache) → Code 7 PERMISSION_DENIED
- expecting: enabling the Cloud Firestore API will allow the server to serve snapshots
- next_action: user must enable Cloud Firestore API in Google Cloud Console; app-level fix to surface the error instead of hanging forever

## Evidence

- timestamp: 2026-04-27T15:29
  finding: Playwright comparison shows both local and prod authenticate successfully (alex@gmail.com, Wyloguj visible) but both show "Ładowanie…" indefinitely
  source: e2e/snapshot-test.ts — 20s poll, never resolved

- timestamp: 2026-04-27T15:29
  finding: Firestore WebChannel (gRPC-web) connects with 200 OK but streams empty bodies — connect/empty/reconnect loop with no snapshot delivery
  source: e2e/capture-responses.ts — body: `[[0,["c","...","",8,14,30000]]]` then empty

- timestamp: 2026-04-27T15:29
  finding: Firestore IndexedDB target registered with `readTime: {seconds:0, nanoseconds:0}` — server never acknowledged the listener
  source: e2e/idb-inspect.ts — targets store shows readTime=epoch zero

- timestamp: 2026-04-27T15:29
  finding: Firebase JS SDK in Node (no persistent cache) fires onSnapshot error: "Code: 7 PERMISSION_DENIED: Cloud Firestore API has not been used in project todo-witek-6a21e before or it is disabled"
  source: e2e/test-sdk.ts — definitive server-side error confirmed

- timestamp: 2026-04-27T15:29
  finding: With persistentLocalCache, the SDK treats PERMISSION_DENIED as a transient network error, goes "offline", and never calls onSnapshot callback when cache is empty (first visit). Loading hangs indefinitely.
  source: browser shows no console error; Node SDK (no cache) does fire callback immediately with 0 docs from memory

## Eliminated

- Missing composite index — eliminated. The error is PERMISSION_DENIED at the API level, not FAILED_PRECONDITION
- Different Firebase projects between local and prod — eliminated. Same config.ts used everywhere
- Auth failure — eliminated. Both environments authenticate successfully
- Firestore rules — eliminated. PERMISSION_DENIED is at the API/GCP level, not the security rules level

## Resolution

- root_cause: The Cloud Firestore API is disabled at the Google Cloud project level for project `todo-witek-6a21e`. The Firebase SDK's `onSnapshot` receives PERMISSION_DENIED from the server, treats it as a transient network error, goes to offline mode, and — because the persistent cache is empty on first visit — never fires the snapshot callback. The app is permanently stuck on "Ładowanie…".
- fix: TWO STEPS REQUIRED:
  1. (Manual — human action) Enable Cloud Firestore API at https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=todo-witek-6a21e
  2. (Code fix) Surface the error in the app so it does not hang forever when Firestore is unreachable — the error callback in `observeUserTodos` should propagate the error to the UI
- verification: After enabling the API, both local and prod should show todos (currently 0 exist). The reconnect loop in the WebChannel should stop and the snapshot should fire.
- files_changed: src/firebase/todos.ts (added error callback to onSnapshot — diagnostic only)
