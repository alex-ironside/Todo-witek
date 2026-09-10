# Spec — Todo-witek frontend cutover to the Go API + e2e oracle (migration story 2)

Status: ready-for-dev. Follows story 1 (the Go server: todos + categories + auth,
100% integration-covered, containerized). This story points the existing React
frontend at that server and stands up a Playwright e2e suite as the
no-regression oracle. The Firebase and local backends stay intact and selectable.

## Intent

**Problem:** The frontend still talks to Firebase. The Go backend exists and is
verified at the API level, but nothing proves the whole app works against it,
and nothing proves the migration introduced no user-facing regression.

**Approach:** Add a third `TodoRepository`/`CategoryRepository` implementation
(`api`) that talks to the Go server, a cookie-session auth path, and an `api`
storage mode — all behind the existing seams, so components do not change. Then
add a Playwright e2e suite that drives the real app against the real Go server +
Postgres and asserts every user flow. The suite is the acceptance oracle: it is
the definition of "no regression."

## Existing seams (from the FE map — do not change component code)

- `TodoRepository` (`src/types.ts:74`): `create, update, toggleDone, delete, reorder, observe`.
- `CategoryRepository` (`src/types.ts:109`): `create, update, delete, observe`.
- Impl selection: `useStorageMode()` → `'local' | 'firebase'`; `App.tsx` branches and
  provides repos via `RepoProvider` (`src/hooks/RepoContext.tsx`). Components call
  `useRepo()`/`useCategoryRepo()` — backend-agnostic.
- Auth (Firebase): `login/logout/observeAuth`; consumed by `useAuth`. Go uses
  cookie sessions: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Realtime → polling: `observe(cb, onErr)` must call `cb` promptly once, then on an
  interval, and return an `Unsubscribe` that stops it; sort by `position` client-side.

## Tasks & Acceptance

### A. Data + auth adapters (unit-tested, mock `fetch` at the boundary)
- [ ] `src/services/apiClient.ts` — a small `fetch` wrapper: base URL from
  `import.meta.env.VITE_API_URL`, `credentials: 'include'`, JSON encode/decode,
  throw a typed error carrying HTTP status on non-2xx.
- [ ] `src/repos/apiTodoRepo.ts` — `createApiTodoRepo(): TodoRepository`. `observe`
  polls `GET /todos` (immediate first fetch, then interval), sorts by `position`,
  calls `onError` on failure (with a `code` field so the existing banner logic
  still distinguishes auth errors), returns an interval-stopping `Unsubscribe`.
  `create`/`update`/`toggleDone`/`delete`/`reorder` map to the todo endpoints.
- [ ] `src/repos/apiCategoryRepo.ts` — `createApiCategoryRepo(): CategoryRepository`
  against `/categories`; `delete` treats a 404/204 as success (idempotent, so the
  delete→reassign flow never throws).
- [ ] `src/services/apiAuth.ts` — `login/logout` and a one-shot `me()` resolving the
  session (replacing `observeAuth`'s subscription). `user.id` (UUID) replaces
  `user.uid`.
- [ ] Vitest for each, mocking `fetch`; 100% of new lines. Follow the existing
  `src/firebase/*.test.ts` module-boundary mock pattern.

### B. Wire the `api` storage mode (no component changes)
- [ ] Add `'api'` to `StorageMode` (`src/services/storageMode.ts`).
- [ ] `App.tsx`: an `ApiApp` branch mirroring `FirebaseApp` but using `apiAuth`
  (`me()` on mount, no realtime auth subscription), constructing the api repos
  from `user.id`, and NOT wiring push (same as local mode).
- [ ] A settings toggle option for `api` mode (mirrors the existing local/firebase
  toggle; no new UI pattern).
- [ ] `.env` docs: `VITE_API_URL` (e.g. `http://localhost:8080`).
- [ ] typecheck (`tsc --noEmit`), lint, and `vitest` all green; coverage not lowered.

### C. Playwright e2e acceptance oracle
- [ ] `playwright.config.ts` (there is none today; the `e2e/` dir holds ad-hoc debug
  scripts, not a suite). Deterministic: seed/reset per run, assert on UI/state, no
  sleeps.
- [ ] A run harness that brings up the real stack: Postgres (docker), `cmd/serve`
  with `DATABASE_URL`, a seeded user (`cmd/seed-user`), and the built FE served with
  `VITE_API_URL` pointing at the server, in `api` storage mode.
- [ ] e2e specs covering EVERY user flow (not just the touched one): login/logout,
  list, create (default + chosen category + reminders), toggle done, edit title,
  delete, reorder (assert resulting order), category create/rename/delete with
  todo reassignment to uncategorized, and the auth-gate (unauthed → login screen).
  Each asserts the observable outcome.
- [ ] Suite runs green against the Go backend. A failure blocks done exactly like a
  unit failure. This green run is the no-regression proof.

## Boundaries & Constraints

**Always:** Reproduce behavior exactly; components unchanged. Reuse the repo seam.
100% coverage of new adapter lines (mock `fetch` only — never mock the DB for the
Go server's own tests, which already exist). e2e is deterministic and asserts
outcomes.

**Never:** Change the `TodoRepository`/`CategoryRepository` interfaces. Break the
`local` or `firebase` modes. Introduce a state library or a second HTTP client.

**Known gaps carried to later stories (out of scope here; each needs infra the
user provides):**
- `resetPassword` — the FE reset flow has no Go endpoint; needs an email/SMTP
  provider before it can be reproduced without regression.
- Cross-device push (FCM → Web Push/VAPID) — needs VAPID keys; `api` mode simply
  does not wire push (same as `local` mode) until that story.
- Firestore → Postgres one-time data export — needs the user's Firebase creds.
- Deploy on merge to main → Hetzner — needs the Hetzner box + secrets.

## Verification
- `npm run typecheck`, `npm run lint`, `npm test` (vitest) all green; new adapter
  code fully covered.
- `npx playwright test` green against the real Go server + Postgres.
- Adversarial review of the adapters (auth/session handling, polling cleanup,
  error mapping) to a clean pass before done.
