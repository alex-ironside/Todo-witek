# Spec — Todo-witek Go server foundation (migration story 1)

Status: ready-for-dev. Authorized by the user 2026-09-10 to migrate Todo-witek's
backend off Firebase to Go + Postgres (overrides the repo's old Firebase-only
CLAUDE.md, which will be rewritten when the migration lands).

## Intent

**Problem:** Todo-witek's backend is Firebase (Firestore + Auth + FCM) and is
hosted on GitHub Pages/Firebase. To move onto the Hetzner/Neon stack it needs a
self-hosted Go + Postgres backend that reproduces the exact existing behavior
with zero regressions.

**Approach:** Build a Go HTTP server (chi + pgx) in a new `server/` module that
replaces the Firestore data-access surface + email/password auth. This story is
the foundation: schema + migrations + session auth + todos CRUD/reorder, fully
integration-tested against real Postgres. Push (VAPID), the reminder-due job,
the FE `apiTodoRepo`, and the one-time Firestore→Postgres data export are
SEPARATE later stories. The FE is not touched in this story.

## Existing contract to preserve (from the Firebase app — do NOT regress)

Data-access surface (`src/firebase/todos.ts`, `auth.ts`) that the Go API mirrors:
- `createTodo(ownerId, {title, category, reminders}) -> id` — sets `done:false`,
  `position: -Date.now()` (strictly-decreasing, newest sorts first), timestamps.
- `updateTodo(id, fields)` ; `toggleDone(id, done)` ; `deleteTodo(id)`.
- `reorderTodos(orderedIds[])` — batch-set `position` across the list.
- `observeUserTodos(ownerId)` — returns the owner's todos ordered by `createdAt`
  desc then client-sorted by `position`. Real-time in Firestore → **client
  polling** in the Go stack (this story just exposes `GET /todos`).
- `login(email,password)` ; `logout()` ; `observeAuth()` → `GET /auth/me` ;
  `resetPassword(email)`.

Todo document shape (`src/types.ts`): `{id, ownerId, title, done,
reminders:[{id, remindAt:ms, fired:bool}], position, category:'prywatne'|'sluzbowe',
createdAt, updatedAt}`.

Authorization (`firestore.rules`): a signed-in user may read/create/update/delete
ONLY their own todos (`ownerId == uid`); `ownerId` is immutable on update.

## Boundaries & Constraints

**Always:** Reproduce the data shape + owner-scoping exactly. Email/password
login ONLY (no public signup — users are seeded; matches the repo rule). All
Firestore semantics preserved: `position = -now()` on create, category values
`prywatne`/`sluzbowe`, reminders array with `fired` flags. 100% integration
coverage against REAL Postgres (testcontainers-go) — no mocked DB. TDD-first.
Secrets only from env, never committed.

**Security (enter at planning, per security-compliance):**
- Passwords hashed with **argon2id** (`golang.org/x/crypto/argon2`), params
  m=64MiB, t=3, p=2 (tunable via env), unique 16-byte salt per user.
- Session token = 32 random bytes (crypto/rand), returned in an **httpOnly,
  Secure, SameSite=Lax** cookie; stored **hashed** (SHA-256) in `sessions`,
  never plaintext. Expiry (default 30d) + server-side revoke on logout.
- Owner-scoping enforced in SQL (`WHERE owner_id = $session_user`) on EVERY
  todo query — cross-owner access returns 404, never another user's row.
- Constant-time password compare path (argon2 verify); generic 401 on bad
  login (no user-enumeration).
- No secrets/keys in code or tests; `.env`/config gitignored.

**Ask First:** Changing the todo data shape or the auth model; adding signup;
any FE change (separate story).

**Never:** Mock the database. Store plaintext or reversibly-encrypted passwords
or session tokens. Allow `owner_id` to change on update. Compile on the Hetzner
box.

## Data model (Postgres)

- `users(id uuid pk, email citext unique not null, password_hash text not null,
   created_at timestamptz not null default now())`
- `sessions(token_hash bytea pk, user_id uuid not null references users(id) on
   delete cascade, created_at timestamptz not null default now(), expires_at
   timestamptz not null)`
- `todos(id uuid pk, owner_id uuid not null references users(id) on delete
   cascade, title text not null, done boolean not null default false,
   reminders jsonb not null default '[]', position double precision not null,
   category text not null default 'prywatne' check (category in
   ('prywatne','sluzbowe')), created_at timestamptz not null default now(),
   updated_at timestamptz not null default now())` ; index on
   `(owner_id, created_at desc)`.
- `push_subscriptions(...)` — created but UNUSED this story (push is later).
  Minimal: `(id uuid pk, user_id uuid not null, endpoint text, p256dh text,
  auth text, created_at timestamptz)`.
- Migrations embedded (`//go:embed migrations/*.sql`) + applied idempotently on
  startup and in tests. `reminders` stored as JSONB matching the FE array.

## HTTP API (chi)

- `POST /auth/login {email,password}` → 200 + Set-Cookie session; 401 generic on
  failure.
- `POST /auth/logout` → 204, revokes session.
- `GET /auth/me` → 200 `{id,email}` when authed; 401 otherwise.
- `GET /todos` → owner's todos, `created_at desc` (FE re-sorts by position).
- `POST /todos {title,category,reminders}` → 201 `{...todo}`, `done:false`,
  `position=-now_ms`.
- `PATCH /todos/{id} {title?,category?,reminders?,done?}` → 200; owner-scoped;
  `owner_id` immutable; `updated_at` bumped.
- `DELETE /todos/{id}` → 204; owner-scoped.
- `POST /todos/reorder {orderedIds:[...]}` → 204; sets `position` per index in a
  single transaction; owner-scoped (ignores/denies ids not owned).
- `GET /health` → 200.
- Session-auth middleware; JSON error envelope `{error}`; all todo routes require
  auth.
- Seed mechanism: a `cmd/seed-user` (or `POST /admin/users` gated by an env
  admin token) to create a user with a hashed password — since there is no
  public signup. Pick the simpler: a small `seed-user` CLI in the module.

## Tasks & Acceptance

- [ ] `server/go.mod` — module `github.com/alex-ironside/todo-witek/server`, Go 1.26; deps chi/v5, pgx/v5, x/crypto (vet before adding).
- [ ] `server/migrations/0001_init.sql` — the schema above.
- [ ] `server/internal/store` — pgx-backed store: users, sessions, todos CRUD/reorder; owner-scoped queries.
- [ ] `server/internal/auth` — argon2id hash/verify, session create/lookup/revoke, cookie helpers.
- [ ] `server/internal/api` — chi router, handlers, auth middleware, JSON errors.
- [ ] `server/cmd/serve/main.go` — compose store+api, run migrations, listen on PORT.
- [ ] `server/cmd/seed-user/main.go` — create a user (email + password from args/env) with argon2id hash.
- [ ] `server/internal/api/*_test.go` (+ store tests) — integration tests vs real Postgres via testcontainers-go: every endpoint, owner-isolation (cross-owner 404), auth 401 paths, reorder tx, position/category/reminders semantics, session expiry/revoke. 100% coverage of server logic, no mocks.
- [ ] `server/.gitignore` + `.env.example` — no secrets committed.

**Acceptance Criteria (Given/When/Then):**
- Given a seeded user, when `POST /auth/login` with correct creds, then 200 + httpOnly session cookie; with wrong creds, 401 generic.
- Given user A's session, when A `POST /todos`, then the row has `done=false`, `position<0`, chosen category, and is returned by A's `GET /todos` but never by user B's.
- Given user B's session, when B `PATCH`/`DELETE`s A's todo id, then 404 (owner-scoped), and A's row is unchanged.
- Given a list, when `POST /todos/reorder` with a permutation, then each todo's `position` reflects its index, in one transaction.
- Given `go test ./...` with Docker available, then all integration tests pass and server logic is 100% covered.

## Verification

- `go vet ./...`, `gofmt -l` clean, `go build ./...`.
- `go test ./... -cover` (real Postgres via testcontainers) — all green.
- Coverage 100% of server packages (exclude `cmd/` mains, verified by build + a serve smoke).
- `govulncheck ./...` clean.
