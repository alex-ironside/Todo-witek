# Deploying Todo Witek to Hetzner

The Go API (`server/`) runs on a single Hetzner VPS behind Caddy. Caddy also
serves the built React SPA on the same origin and terminates TLS, so the
`SameSite=Lax` session cookie works and no CORS is needed. Postgres is not on
the box — it is Neon, reached over `DATABASE_URL`.

```
browser ──HTTPS──> Caddy ─┬─ /auth /todos /categories /health ──> server:8080 (Go)
                          └─ everything else ─────────────────────> SPA (dist/)
                                                     server ──────> Neon Postgres
```

## One-time setup on the VPS

1. Install Docker and the compose plugin.
2. Point the domain's DNS A/AAAA record at the box (Caddy needs it to issue TLS).
3. Create `/opt/todo-witek/deploy/.env` (never committed):

   ```
   DOMAIN=todo.example.com
   DATABASE_URL=postgres://<user>:<pass>@<neon-host>/<db>?sslmode=require
   ```

   Get `DATABASE_URL` from the Neon project (pooled connection string, SSL required).

## Deploying

`.github/workflows/deploy-hetzner.yml` runs the gates (typecheck, unit tests),
builds the SPA with `VITE_BASE=/`, rsyncs `server/`, `deploy/`, and `dist/` to
`/opt/todo-witek`, then `docker compose --env-file .env up -d --build`.

It is `workflow_dispatch` (manual) until the box exists. To make a merge to main
deploy automatically, uncomment the `push: branches: [main]` trigger in that
workflow — do so only after the secrets below are set, or every push will fail.

Manual deploy from a checkout on the box:

```
cd /opt/todo-witek/deploy
docker compose --env-file .env up -d --build
```

### Required GitHub Actions secrets

| Secret             | What                                                        |
| ------------------ | ---------------------------------------------------------- |
| `HETZNER_HOST`     | VPS IP or hostname                                         |
| `HETZNER_USER`     | SSH user with Docker access                                |
| `HETZNER_SSH_KEY`  | Private key (ed25519) authorized on the box                |

`DOMAIN` and `DATABASE_URL` live in `deploy/.env` on the box, not in CI.

## Notes

- The SPA must be built with `VITE_BASE=/` for same-origin hosting (the GitHub
  Pages build uses `/todo-witek/`; do not mix them). Once Hetzner is the live
  target, retire `.github/workflows/deploy.yml` (the Pages deploy).
- Secure cookies are on in production because Caddy serves HTTPS; `cmd/serve`
  only disables them when `COOKIE_SECURE=false` (used for the local e2e run).
- Health check: `https://<domain>/health` returns `{"status":"ok"}`.
