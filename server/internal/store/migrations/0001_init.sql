-- Todo-witek Go backend schema. Reproduces the Firestore data contract
-- (todos + fcmTokens) and adds self-hosted auth (users + sessions).
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash bytea PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS todos (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      text NOT NULL,
    done       boolean NOT NULL DEFAULT false,
    reminders  jsonb NOT NULL DEFAULT '[]'::jsonb,
    position   double precision NOT NULL,
    category   text NOT NULL DEFAULT 'prywatne',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS todos_owner_created_idx ON todos (owner_id, created_at DESC);

-- User-managed categories. category on a todo is a soft reference to a
-- categories.id (dangling/legacy values are resolved to a virtual bucket on
-- the client), so there is deliberately no foreign key from todos.category and
-- no unique(owner_id, name): the app never enforced either.
CREATE TABLE IF NOT EXISTS categories (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       text NOT NULL,
    position   double precision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_owner_position_idx ON categories (owner_id, position);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   text NOT NULL,
    p256dh     text NOT NULL,
    auth       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, endpoint)
);
