# Project rules — Todo Witek

This file is durable instruction for Claude (and humans) working in this repo.
Read it before changing code. When the rules below conflict with a request,
ask before deviating.

## Stack — non-negotiable

- **React 18** with hooks. **Not Next.js.** Routing, if added, via
  `react-router-dom`.
- **Vite** for build/dev. **TypeScript** strict mode. No `.js`/`.jsx` source
  files — `.ts`/`.tsx` only. Tests live next to the file as
  `*.test.ts`/`*.test.tsx`.
- **Firebase** for everything backend: Auth (email/password, no public
  sign-up), Firestore (offline-first via `persistentLocalCache`), Cloud
  Messaging for push. No alternative DBs or auth providers.
- **Vitest + React Testing Library** for tests.
- **vite-plugin-pwa** for the app shell SW; `public/firebase-messaging-sw.js`
  is a separate FCM SW.
- Deploys to **GitHub Pages** via `.github/workflows/deploy.yml`.

## Workflow — TDD, always

1. **Red.** Write or update a failing test that captures the new behavior or
   bug. Run it; confirm it fails for the right reason.
2. **Green.** Write the minimum code to make the test pass. No extra
   features.
3. **Refactor.** Clean up while tests stay green. Then commit.

Pure logic (`src/utils`, `src/services`) must be 100% unit-tested without
mocking Firebase. Firebase wrappers are tested by mocking the SDK at the
module boundary (see `src/firebase/todos.test.ts` for the pattern).

Before any commit: `npm test`, `npm run typecheck`, `npm run build` must
all pass.

## Design principles

### SOLID
- **Single responsibility.** A module does one thing.
  `src/firebase/auth.ts` only wraps auth; it doesn't touch Firestore.
- **Open/closed.** Extend via factories or new modules, not by editing
  stable APIs. The reminder scheduler takes injected `notify`/`onFired`
  so behavior can be swapped without changing the scheduler.
- **Liskov.** Don't widen return types or swallow errors in subtypes.
- **Interface segregation.** Components receive narrow prop types — pass
  the exact `Todo` they need, not a god context.
- **Dependency inversion.** App code depends on `src/firebase/*` wrappers,
  never on `firebase/*` directly. The wrappers are the seam for tests.

### KISS
- Prefer the simplest thing that passes the test. No premature
  abstractions, no design-for-tomorrow.
- Three similar lines is better than a clever helper. Reach for an
  abstraction only after the third copy.
- One source of truth per concern. `src/firebase/config.ts` holds all
  Firebase keys; `src/types.ts` holds domain types.

### DRY (with judgment)
- Extract a helper when the same logic appears in 3+ places **and** the
  abstraction has a clear name.
- Don't extract across unrelated domains just because the code shape
  matches — coincidental duplication isn't duplication.

### Clean code
- Names describe intent (`observeUserTodos`, not `getStuff`).
- Functions do one thing. If you need "and" to describe it, split it.
- No comments that restate the code. Comments explain WHY, not WHAT
  (hidden constraints, gotchas, security notes).
- No dead code, no commented-out blocks.
- Errors propagate or are handled at a clear boundary — no silent
  catches.

## Repo conventions

### File layout

```
src/
  types.ts              ← domain types (Todo, Reminder, Unsubscribe)
  firebase/             ← thin wrappers; the only place that imports `firebase/*`
    config.ts           ← user-supplied keys (gitignored values)
    app.ts              ← single Firebase app + Firestore (offline cache)
    auth.ts             ← login/logout/observe
    todos.ts            ← Firestore CRUD for todos
    messaging.ts        ← FCM init/getToken
    pushTokens.ts       ← saves device token under user
  hooks/                ← React glue; no business logic
  services/             ← pure logic (reminderScheduler, notificationService)
  components/           ← React components, prop-typed
  utils/                ← pure helpers, fully unit tested
  test/setup.ts         ← Vitest setup
public/
  firebase-messaging-sw.js  ← FCM background SW (config copied from src/firebase/config.ts)
firestore.rules         ← only signed-in user can CRUD their own todos
functions/              ← optional Cloud Function for cross-device push
```

### TypeScript
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` are on.
- Prefer `interface` for object shapes used across modules; `type` for
  unions/aliases.
- No `any`. Use `unknown` and narrow. SDK types come from `firebase/*`
  exports.

### React
- Functional components, hooks only. No classes.
- Each hook does one job (`useAuth`, `useTodos`, `useOnlineStatus`).
- Side effects belong in `useEffect`; cleanup must unsubscribe.
- Keep components thin — call wrappers, don't reach into Firebase.

### Firebase
- All Firestore reads/writes go through `src/firebase/todos.ts` (or a
  sibling repo file). Components never import `firebase/firestore`.
- Offline-first by default. Don't bypass `persistentLocalCache`.
- Never relax `firestore.rules` to allow cross-user access.
- Auth is email/password **login only**. Don't add `createUserWithEmail`,
  Google sign-in, etc., without explicit instruction.

### Tests
- Co-locate: `foo.ts` ↔ `foo.test.ts`.
- Mock `firebase/*` at module boundary; mock `./app` to short-circuit
  initialization.
- For pure logic, no mocks — call the function directly.
- Use `vi.useFakeTimers()` for anything time-dependent.

## Don'ts

- Don't add `.js`/`.jsx` files. Don't add a second build tool.
- Don't introduce a state library (Redux, Zustand, etc.) without
  discussion. Hooks + Firestore subscriptions are sufficient.
- Don't bypass the wrappers — no direct `firebase/firestore` imports
  outside `src/firebase/`.
- Don't commit Firebase config values. `src/firebase/config.ts` ships
  blank; real keys go in via the user or CI.
- Don't disable strict TS, lint rules, or test failures to "ship faster."
  Fix the root cause.
