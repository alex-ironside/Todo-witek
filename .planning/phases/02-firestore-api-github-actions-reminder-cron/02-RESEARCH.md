# Phase 2: Firestore API + GitHub Actions Reminder Cron — Research

**Researched:** 2026-04-28
**Domain:** Firebase Admin SDK, GitHub Actions cron, Firestore error surfacing, FCM multicast
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Detect `error.code === 'permission-denied'` specifically; show actionable banner "Firestore not enabled — enable it at console.firebase.google.com"
- **D-02:** Generic `todosLoadError` banner stays for other errors; only `PERMISSION_DENIED` gets its own message. Detection location is implementer's discretion.
- **D-03:** New top-level `scripts/` directory. Separate from `functions/` (Cloud Functions). Workflow references `scripts/send-reminders.js` directly.
- **D-04:** Script language: plain JavaScript (CommonJS) matching `functions/index.js`. No TypeScript compilation in cron workflow.
- **D-05:** When `sendEachForMulticast` returns `registration-token-not-registered`, delete that token doc from `fcmTokens`.
- **D-06:** Fire only reminders where `remindAt` is between `(now - 30 minutes)` and `now`. Reminders older than 30 min are silently skipped.
- **D-07:** Integration tests against Firebase emulator (Firestore + FCM). Test runner: Vitest with a `vitest.config.ts` inside `scripts/` targeting Node environment.
- **D-08:** Tests cover: due reminder detection (in-window vs. out-of-window), FCM dispatch, mark-fired update, stale token deletion on `registration-token-not-registered`.

### Claude's Discretion

- Exact seam for PERMISSION_DENIED detection (hook vs. repo vs. `observeUserTodos` wrapper)
- How to run emulator in CI for scripts/ tests (reuse existing config or add separate one)
- Whether `scripts/` gets its own `package.json` or reuses the root one

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

---

## Summary

Phase 2 has two independent jobs. Plan 01 adds visible failure to the React app when Firestore is not yet enabled at the GCP level — detecting `permission-denied` from `onSnapshot` and rendering an actionable banner. This change is entirely client-side and requires no new dependencies. Plan 02 creates a standalone CommonJS Node.js cron script (`scripts/send-reminders.cjs`) invoked by a GitHub Actions `schedule:` workflow every 15 minutes. The script authenticates to Firebase via a service account JSON stored as a GitHub secret, queries all non-done todos for due reminders, sends FCM pushes via `sendEachForMulticast`, marks reminders fired, and deletes stale tokens.

**Critical constraint:** Root `package.json` has `"type": "module"`. A `.js` file in `scripts/` will be treated as ESM, causing `require is not defined` at runtime. The CommonJS intent of D-04 requires either `.cjs` extension or a `scripts/package.json` with `"type": "commonjs"`. Research recommends `.cjs` extension (see Pitfall 6 and Pattern 1).

The data model is significant: reminders are an array field on each `Todo` document, not a separate collection. There is no Firestore query predicate for `remindAt` — the look-back window filter is pure JavaScript after fetching todos. No collection-group index or composite index is needed.

Firebase Admin SDK 13.8.0 is the current release (vs. `^12.4.0` in `functions/package.json`). For consistency with the existing `functions/` setup, pin `firebase-admin` to `^12.4.0`. The cron workflow must run Node 20 (consistent with `deploy.yml` and `functions/engines.node`).

**Primary recommendation:** Implement PERMISSION_DENIED detection at the `useTodos` hook level (the `onError` callback already receives the raw `FirebaseError`). Use `.cjs` extension for `scripts/send-reminders.cjs` to resolve the `"type": "module"` conflict. Use `admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))` — the simplest credential pattern that works in GitHub Actions without file-system access.

---

## Project Constraints (from CLAUDE.md)

These directives from `CLAUDE.md` apply to this phase:

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| No `.js`/`.jsx` source files — `.ts`/`.tsx` only | **EXCEPTION:** D-04 (locked) explicitly allows CommonJS for the cron script. Use `.cjs` extension (not `.js`) to avoid ESM conflict with `"type": "module"` in root `package.json`. |
| TDD always (Red → Green → Refactor) | Tests must be written before implementation in each plan |
| Tests co-located with source | `scripts/send-reminders.test.cjs` next to `scripts/send-reminders.cjs` |
| `npm test`, `npm run typecheck`, `npm run build` must all pass before commit | Cron script tests run via separate `npm run test:scripts` — must not break main suite |
| Firebase wrappers are the only place importing `firebase/*` (client SDK) | Cron script uses `firebase-admin` — a different SDK. CLAUDE.md rule applies to client SDK only. |
| No new state libraries without discussion | Not applicable |
| TypeScript strict mode | Applies to all `.ts`/`.tsx` files; `scripts/vitest.config.ts` must be valid TypeScript |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PERMISSION_DENIED error detection | Frontend (React hook) | — | Error surfaces in `onSnapshot` callback — already plumbed through `observeUserTodos` → `useTodos` |
| Error banner render | Frontend (React component) | — | Existing `{error && <div className="banner warn">...` pattern in `Shell` |
| Firestore query for due todos | Cron script (Node.js) | — | Admin SDK bypasses security rules, reads across all users |
| FCM multicast send | Cron script (Node.js) | — | Admin SDK messaging, not client SDK |
| Mark-fired writes | Cron script (Node.js) | — | `doc.ref.update({ reminders: updated })` via Admin SDK |
| Stale token cleanup | Cron script (Node.js) | — | Delete `fcmTokens` doc when `registration-token-not-registered` |
| Cron scheduling | GitHub Actions | — | `schedule: cron: '*/15 * * * *'` |
| Secret management | GitHub repository secrets | — | `FIREBASE_SERVICE_ACCOUNT_KEY` JSON stored as secret |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase-admin | ^12.4.0 | Admin SDK — Firestore + FCM access in Node.js | Matches `functions/package.json`; official Firebase server SDK |
| vitest | ^2.0.5 (root) | Test runner for cron script integration tests | Already in project; D-07 mandates it |

**Version verification:** `firebase-admin` latest is 13.8.0 [VERIFIED: npm registry]. Pinning to `^12.4.0` for consistency with `functions/package.json` [ASSUMED — consistency rationale; could upgrade to 13.x if desired, but CONTEXT.md doesn't specify]. The `^` range allows patch/minor updates within major 12.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @firebase/rules-unit-testing | latest | Firebase emulator test utilities | Only if emulator test seeding helper is needed; may not be required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.cjs` extension | `scripts/package.json` with `"type": "commonjs"` | Both solve ESM conflict. `.cjs` is simpler (no extra file). Recommended. |
| `JSON.parse(process.env.KEY)` | Base64-decode approach | Base64 is more robust for newline issues; JSON.parse is simpler. Either works. |
| Root `package.json` devDep | `scripts/package.json` with deps | Separate `package.json` adds isolation but splits install steps. Root devDep is simpler. |

**Installation (to root package.json devDependencies):**
```bash
npm install --save-dev firebase-admin@^12.4.0
```

---

## Architecture Patterns

### System Architecture Diagram

```
GitHub Actions (schedule: */15 * * * *)
        │
        ▼
scripts/send-reminders.cjs (Node 20, CommonJS via .cjs extension)
        │
        ├─ cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
        │
        ├─ db.collection('todos').where('done','==',false).get()
        │        │
        │        ▼
        │   [JS filter] remindAt in (now-30min, now] AND !fired
        │        │
        │        ▼ (for each todo with due reminders)
        │   db.collection('fcmTokens').where('userId','==',ownerId).get()
        │        │
        │        ▼
        │   messaging.sendEachForMulticast({ tokens, notification, data })
        │        │
        │        ├─ responses[idx].success === false
        │        │   && error.code === 'messaging/registration-token-not-registered'
        │        │        └─ delete fcmTokens doc
        │        │
        │        └─ mark reminders fired: doc.ref.update({ reminders: updated })
        │
React App (client SDK, browser)
        │
        └─ observeUserTodos → onSnapshot error callback
                │
                └─ error.code === 'permission-denied'
                        └─ distinct banner: t.firestoreNotEnabled
                           (other errors → t.todosLoadError banner)
```

### Recommended Project Structure

```
scripts/
  send-reminders.cjs         ← cron script (CommonJS, .cjs to avoid ESM conflict)
  send-reminders.test.cjs    ← co-located integration tests (Vitest, Node env)
  vitest.config.ts           ← Vitest config: environment:'node'
.github/
  workflows/
    deploy.yml               ← existing (no changes)
    send-reminders.yml       ← new cron workflow
src/
  hooks/
    useTodos.ts              ← add PERMISSION_DENIED branch in onError
  App.tsx                    ← add distinct banner render when error.code === 'permission-denied'
  i18n.ts                    ← add firestoreNotEnabled key
firebase.json                ← add emulators block (Firestore port 8080)
package.json                 ← add firebase-admin devDep, test:scripts script
```

### Pattern 1: CommonJS in ESM-typed Project — Use .cjs Extension

**What:** Root `package.json` contains `"type": "module"`. Node treats all `.js` files in this project as ESM. D-04 requires CommonJS `require()` syntax. The solution is `.cjs` extension, which Node always treats as CommonJS regardless of `"type"` setting.

**When to use:** Any CommonJS file in an ESM-typed project.

```
scripts/send-reminders.cjs     ← Node loads as CommonJS; require() works
scripts/send-reminders.test.cjs ← Vitest handles .cjs files fine
```

The cron workflow references the file by exact name:
```yaml
run: node scripts/send-reminders.cjs
```

D-03 says "the GitHub Actions workflow references `scripts/send-reminders.js` directly" — this must be updated to `.cjs` in the plan. D-04's intent (CommonJS) takes precedence; `.cjs` fulfills the CommonJS intent while resolving the ESM conflict.

### Pattern 2: Firebase Admin SDK — Credential from GitHub Secret

**What:** Initialize `firebase-admin` using a service account JSON stored as a GitHub Actions secret. No file system access required.

```javascript
// Source: https://firebase.google.com/docs/admin/setup + community pattern
// VERIFIED: official docs recommend credential.cert(); JSON.parse from env is
// the standard GitHub Actions pattern for JSON secrets.
'use strict';
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const messaging = getMessaging();
```

**GitHub Actions secret setup:**
1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key (JSON)
2. GitHub repo → Settings → Secrets → `FIREBASE_SERVICE_ACCOUNT_KEY` = contents of JSON file
3. In workflow: `env: FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}`

**Note on newlines:** If `private_key` multiline causes JSON parse issues, base64-encode the secret and decode in script:
```javascript
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
);
```

### Pattern 3: Due Reminder Query (JS filter, not Firestore predicate)

**What:** Reminders are an array field on `Todo` documents. Firestore cannot filter on array element sub-fields in a `where()` clause. The look-back window is a pure JavaScript filter after fetching non-done todos.

**Critical:** Do NOT attempt `collectionGroup('reminders')` or add composite indexes. No new Firestore index is needed.

```javascript
// Source: adapted from functions/index.js + D-06 (CONTEXT.md)
const now = Date.now();
const windowStart = now - 30 * 60 * 1000; // 30-minute look-back

const snap = await db.collection('todos').where('done', '==', false).get();

for (const doc of snap.docs) {
  const todo = doc.data();
  const reminders = todo.reminders || [];
  // JS filter — not a Firestore query
  const due = reminders.filter(
    (r) => !r.fired && r.remindAt <= now && r.remindAt >= windowStart
  );
  if (due.length === 0) continue;
  // ... fetch tokens, send FCM, mark fired
}
```

### Pattern 4: sendEachForMulticast + Stale Token Cleanup

**What:** `sendEachForMulticast` returns a `BatchResponse` where `responses[idx]` maps 1:1 to input `tokens[idx]`. Failed sends expose `error.code`.

```javascript
// Source: https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
// VERIFIED: BatchResponse.responses array, resp.success, resp.error.code from official docs
const response = await messaging.sendEachForMulticast({
  tokens: tokenList,
  notification: { title: todo.title, body: 'Reminder' },
  data: { todoId: doc.id },
});

if (response.failureCount > 0) {
  const deletePromises = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error && resp.error.code;
      if (code === 'messaging/registration-token-not-registered') {
        // D-05: delete stale token doc (token string IS the document ID per pushTokens.ts)
        deletePromises.push(
          db.collection('fcmTokens').doc(tokenList[idx]).delete()
        );
      }
      console.error(`[FCM] token ${idx} failed: ${code}`);
    }
  });
  await Promise.all(deletePromises);
}
```

**Token document ID:** In `pushTokens.ts`, the FCM token string IS the document ID (`doc(collection(getDb(), COL), token)`). So `db.collection('fcmTokens').doc(tokenValue).delete()` is correct.

### Pattern 5: PERMISSION_DENIED Detection in Client Hook

**What:** Firebase client SDK surfaces Firestore errors in `onSnapshot`'s error callback as `FirebaseError` with a `.code` string property. For security rule failures, the code is `'permission-denied'`.

**Recommended seam:** `useTodos.ts` `onError` handler. The error is already propagated there; no change to `observeUserTodos` needed.

```typescript
// useTodos.ts — the onError callback already exists; just propagate the full Error
(err) => {
  setError(err);   // err is FirebaseError with .code property
  setLoading(false);
}

// App.tsx Shell render — branch on error.code:
{error && (error as { code?: string }).code === 'permission-denied' ? (
  <div className="banner warn">{t.firestoreNotEnabled}</div>
) : error ? (
  <div className="banner warn">{t.todosLoadError}</div>
) : null}
```

**i18n key (Polish, matching existing pattern):**
```typescript
// src/i18n.ts — add to the t object:
firestoreNotEnabled:
  'Firestore nie jest włączony — włącz go na console.firebase.google.com',
```

**Note:** Admin SDK bypasses Firestore security rules entirely — `permission-denied` can only appear in the client SDK path. The cron script never encounters this error.

**`error.code` values for Firestore `onSnapshot`:**
- `'permission-denied'` — security rules rejected the read [CITED: firebase-js-sdk GitHub issues]
- `'unavailable'` — network error or Firestore not provisioned at GCP level
- `'failed-precondition'` — missing composite index

### Pattern 6: GitHub Actions Cron Workflow

```yaml
# .github/workflows/send-reminders.yml
name: Send Due Reminders

on:
  schedule:
    - cron: '*/15 * * * *'   # every 15 minutes, UTC
  workflow_dispatch:           # allow manual trigger for debugging

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Send due reminders
        env:
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
        run: node scripts/send-reminders.cjs
```

**Cron reliability:** GitHub Actions schedules are UTC-only and may be delayed 10–30 minutes under high load. The 30-min look-back window (D-06) was sized to absorb this: 2 × 15-min cycles = buffer for one missed/delayed run.

### Pattern 7: Vitest Config for Node Environment (scripts/)

**What:** The existing `vite.config.ts` sets `environment: 'jsdom'` for React component tests. The cron script tests need `environment: 'node'` and must NOT share the jsdom setup.

```typescript
// scripts/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // No setupFiles — no @testing-library/jest-dom needed
    include: ['scripts/**/*.test.cjs'],
  },
});
```

**Running scripts/ tests (separate npm script — recommended):**
```json
"test:scripts": "vitest run --config scripts/vitest.config.ts"
```

The scripts/ tests require the Firebase emulator running (FIRESTORE_EMULATOR_HOST), which should not be a prerequisite for the main React test suite. Keep them separate.

### Pattern 8: Firebase Emulator for Integration Tests

**What:** When `FIRESTORE_EMULATOR_HOST` is set, `firebase-admin` automatically connects to the emulator instead of production Firestore.

```javascript
// Set before require/initializeApp, OR use firebase emulators:exec:
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
```

**Via `firebase emulators:exec` (sets env vars automatically):**
```bash
npx firebase emulators:exec --only firestore \
  "npx vitest run --config scripts/vitest.config.ts"
```

**In CI (scripts test job):**
```yaml
- run: |
    npx firebase emulators:exec --only firestore \
      "npm run test:scripts" \
      --project todo-witek
```

**FCM emulator:** Does not simulate `sendEachForMulticast` delivery end-to-end. Mock the `messaging` module in tests. [ASSUMED — FCM emulator has limited send simulation]

**firebase.json emulators block (currently missing — Wave 0 gap):**
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "ui": { "enabled": false }
  }
}
```

### Anti-Patterns to Avoid

- **`require()` in a `.js` file in an ESM project:** Root has `"type": "module"`. Use `.cjs` extension.
- **Firestore `where()` on array subfield:** `where('reminders.remindAt', '<=', now)` does not work on arrays. Use JS filter.
- **Collection group query on `reminders`:** Reminders are not a subcollection — they are an array field on each todo doc.
- **Workload Identity Federation for Admin SDK:** WIF is not supported by `firebase-admin`. Use service account JSON.
- **Sharing the jsdom Vitest config with Node tests:** `firebase-admin` imports break in jsdom environment.
- **`firebase-admin` imported in `src/firebase/`:** Admin SDK belongs only in `scripts/` and `functions/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FCM multicast with error handling | Custom HTTP loop | `messaging.sendEachForMulticast()` | Handles batching, retry semantics, per-token error codes |
| Service account auth in CI | File-writing + GOOGLE_APPLICATION_CREDENTIALS | `credential.cert(JSON.parse(env))` | No disk writes, simpler |
| Emulator connection management | Custom port config code | `FIRESTORE_EMULATOR_HOST` env var or `emulators:exec` | Auto-detected by Admin SDK |
| Token validity tracking | Custom token registry | Delete on `registration-token-not-registered` | FCM is the authoritative source |

---

## Common Pitfalls

### Pitfall 1: Double-Fire on Overlapping Cron Runs

**What goes wrong:** If a cron run takes > 15 minutes, the next scheduled run starts before the previous completes. Two concurrent runs may both detect the same unfired reminder and send duplicate notifications.

**Why it happens:** `doc.ref.update({ reminders: updated })` is last-write-wins; no check-and-set.

**How to avoid:** Use `db.runTransaction()` for the mark-fired step, or accept rare double-fire as the trade-off (CONTEXT.md is silent on this). Simpler code: accept it. Correct code: transaction.

**Warning signs:** Users report duplicate notifications for the same reminder.

### Pitfall 2: firebase.json Missing Emulators Block

**What goes wrong:** `firebase emulators:exec --only firestore` fails with "No emulators configured."

**Why it happens:** Current `firebase.json` only has `firestore.rules` and `firestore.indexes.json`. No `emulators` block exists [VERIFIED: read firebase.json directly].

**How to avoid:** Wave 0 task adds the emulators block (see Pattern 8).

### Pitfall 3: Private Key Newline Encoding in GitHub Secrets

**What goes wrong:** `JSON.parse` fails because `private_key` newlines were corrupted by GitHub's secret masking.

**How to avoid:** Test `JSON.parse` works in CI. If not, switch to base64 encoding (see Pattern 2).

**Warning signs:** Admin SDK throws RSA key parse error on init.

### Pitfall 4: Node Version Mismatch

**What goes wrong:** Cron runs on default Node (could be 16) instead of 20.

**How to avoid:** Pin `node-version: 20` in the cron workflow's `setup-node` step.

### Pitfall 5: firebase-admin Not in Root package.json

**What goes wrong:** `npm ci` at root does not install `firebase-admin` (it's only in `functions/package.json`). Running `node scripts/send-reminders.cjs` fails with `Cannot find module 'firebase-admin/app'`.

**How to avoid:** Add `firebase-admin@^12.4.0` to root `devDependencies`. [VERIFIED: `package.json` read directly — firebase-admin absent from root]

### Pitfall 6: `require is not defined` — ESM/CJS Conflict (BLOCKING)

**What goes wrong:** Root `package.json` has `"type": "module"`. A file named `scripts/send-reminders.js` is treated as ESM by Node. `require('firebase-admin/app')` throws `ReferenceError: require is not defined in ES module scope`.

**Why it happens:** Node's ESM detection: any `.js` file under a `"type": "module"` package is ESM. [VERIFIED: `package.json` line 6: `"type": "module"`]

**How to avoid:** Name the file `scripts/send-reminders.cjs`. Node always treats `.cjs` as CommonJS regardless of `"type"` setting. All references (workflow YAML, test import) must use `.cjs`.

**Alternative:** Add `scripts/package.json` containing `{"type": "commonjs"}` and keep `.js` extension. But `.cjs` is simpler.

**Warning signs:** `ReferenceError: require is not defined` at first `node scripts/send-reminders.js`.

---

## Code Examples

### Full sendEachForMulticast with Token Cleanup

```javascript
// scripts/send-reminders.cjs
// Source: https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
// VERIFIED: BatchResponse.responses[idx].success + resp.error.code pattern
const response = await messaging.sendEachForMulticast({
  tokens: tokenList,
  notification: { title: todo.title, body: 'Reminder' },
  data: { todoId: doc.id },
});

const staleDeletes = [];
response.responses.forEach((resp, idx) => {
  if (!resp.success && resp.error && resp.error.code === 'messaging/registration-token-not-registered') {
    staleDeletes.push(db.collection('fcmTokens').doc(tokenList[idx]).delete());
  }
});
await Promise.all(staleDeletes);
```

### Admin SDK Init (CommonJS, GitHub Actions)

```javascript
'use strict';
// Source: https://firebase.google.com/docs/admin/setup
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();
```

### i18n Key Addition

```typescript
// src/i18n.ts — add to the `t` object alongside todosLoadError:
firestoreNotEnabled:
  'Firestore nie jest włączony — włącz go na console.firebase.google.com',
```

### Vitest Integration Test Skeleton (CommonJS)

```javascript
// scripts/send-reminders.test.cjs
'use strict';
// globals: true in vitest.config.ts means describe/it/expect/vi are global
// FIRESTORE_EMULATOR_HOST must be set before this module loads

const { describe, it, expect, beforeEach, vi } = require('vitest');

// Mock messaging to avoid real FCM calls
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast: mockSendEachForMulticast }),
}));
const mockSendEachForMulticast = vi.fn();

describe('due reminder detection', () => {
  it('fires reminder within 30-min window', async () => { /* ... */ });
  it('skips reminder older than 30 minutes', async () => { /* ... */ });
  it('deletes stale token on registration-token-not-registered', async () => { /* ... */ });
  it('marks reminder fired after send', async () => { /* ... */ });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `admin.messaging().sendMulticast()` | `messaging.sendEachForMulticast()` | firebase-admin v11+ | `sendMulticast` deprecated; `sendEachForMulticast` is current |
| `require('firebase-admin')` (monolithic) | `require('firebase-admin/app')` etc. | firebase-admin v10+ | Modular imports; either works in v12 |
| `admin.firestore()` | `getFirestore()` from `'firebase-admin/firestore'` | v10+ | Modular pattern |

`functions/index.js` uses monolithic `require('firebase-admin')` — acceptable there. `scripts/send-reminders.cjs` should use modular imports (smaller, cleaner). [ASSUMED — either pattern works in 12.x]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pin `firebase-admin` to `^12.4.0` for consistency with `functions/package.json` | Standard Stack | Low — APIs compatible with 13.x |
| A2 | FCM emulator does not simulate `sendEachForMulticast` end-to-end; mock messaging in tests | Pattern 8 | Medium — if FCM emulator gained send simulation, tests could be more realistic |
| A3 | Modular imports (`firebase-admin/app`, etc.) preferred in `scripts/` | State of the Art | Low — monolithic `require('firebase-admin')` also works |

---

## Open Questions (RESOLVED)

1. **Double-fire race condition on mark-fired**
   - What we know: `doc.ref.update()` is last-write-wins; concurrent runs could both fire the same reminder
   - RESOLVED: Accept rare double-fire — personal single-user app, concurrent cron runs are not a realistic scenario. No transaction needed. See T-02-05 in threat model and Plan 02 Task 3.

2. **scripts/ tests in main `npm test` or separate?**
   - RESOLVED: Separate `npm run test:scripts` (requires emulator). Do not merge into root `npm test`. Encoded in Plan 02 Task 1 and the GitHub Actions workflow.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | cron script, tests | Yes (local) | 18.20.4 local / 20 in CI | — |
| firebase CLI (npx) | emulator:exec for tests | Yes (node_modules/.bin/firebase) | in devDeps | Set FIRESTORE_EMULATOR_HOST manually |
| firebase-admin | cron script | NOT in root package.json | ^12.4.0 in functions/ | Must add to root devDeps — BLOCKING |
| Firestore emulator | integration tests | Not configured in firebase.json | — | Wave 0: add emulators block |
| FCM emulator | FCM dispatch tests | Limited support | — | Mock `messaging.sendEachForMulticast` |

**Missing dependencies with no fallback:**
- `firebase-admin` in root `package.json` — required for cron workflow `npm ci`

**Missing dependencies with fallback:**
- FCM emulator — mock the messaging module in tests

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.0.5 (existing root install) |
| Config file (React app) | `vite.config.ts` (test section, environment: jsdom) |
| Config file (scripts/) | `scripts/vitest.config.ts` (Wave 0 gap, environment: node) |
| Quick run command (app) | `npm test -- --run` |
| Quick run command (scripts) | `npm run test:scripts` (requires emulator) |
| Full suite command | `npm test -- --run && npm run test:scripts` (with emulator running) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | `permission-denied` code triggers distinct banner | unit | `npm test -- --run` | No — Wave 0 |
| D-02 | Other errors show generic `todosLoadError` banner | unit | `npm test -- --run` | No — Wave 0 |
| D-06 | Reminder in window (now-30min, now] fires | integration | `npm run test:scripts` | No — Wave 0 |
| D-06 | Reminder older than 30 min is skipped | integration | `npm run test:scripts` | No — Wave 0 |
| D-05 | Stale token deleted on `registration-token-not-registered` | integration | `npm run test:scripts` | No — Wave 0 |
| D-08 | mark-fired update writes `fired: true` back to Firestore | integration | `npm run test:scripts` | No — Wave 0 |

### Wave 0 Gaps

- [ ] `src/hooks/useTodos.test.ts` — add test case for PERMISSION_DENIED → distinct error state (D-01/D-02)
- [ ] `src/i18n.ts` — add `firestoreNotEnabled` key (Polish string, matching pattern of `todosLoadError`)
- [ ] `scripts/vitest.config.ts` — Vitest config for Node environment
- [ ] `scripts/send-reminders.cjs` — create (empty stub to fail first test against)
- [ ] `scripts/send-reminders.test.cjs` — integration test file (D-05, D-06, D-08)
- [ ] `firebase.json` — add `emulators.firestore` block with port 8080
- [ ] `package.json` scripts — add `"test:scripts": "vitest run --config scripts/vitest.config.ts"`
- [ ] `package.json` devDependencies — add `firebase-admin@^12.4.0`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (email/password auth unchanged) | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes — service account has full Firestore access | Create dedicated service account with minimum IAM roles (Firestore User + Firebase Messaging Admin) |
| V5 Input Validation | No (cron reads its own data, no user input path) | — |
| V6 Cryptography | Yes — service account private key in CI | GitHub encrypted secrets; never commit key to repo |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service account key leaked in logs | Information Disclosure | GitHub Actions secret masking; never `console.log` the key or the parsed object |
| Overprivileged service account | Elevation of Privilege | Create dedicated service account with minimum IAM roles |
| Secret committed to git | Information Disclosure | Service account JSON must never be committed; `src/firebase/config.ts` is already the existing gitignored-by-convention pattern |

---

## Sources

### Primary (HIGH confidence)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup) — `credential.cert()` pattern, `initializeApp`
- [FCM Send with Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) — `sendEachForMulticast`, `BatchResponse` structure
- [FCM Error Codes](https://firebase.google.com/docs/cloud-messaging/error-codes) — `registration-token-not-registered` semantics
- `functions/index.js` — existing reminder algorithm (read directly) [VERIFIED]
- `src/firebase/pushTokens.ts` — fcmTokens schema: token string = document ID (read directly) [VERIFIED]
- `src/firebase/todos.ts` — `observeUserTodos` onError pattern (read directly) [VERIFIED]
- `src/hooks/useTodos.ts` — error state propagation (read directly) [VERIFIED]
- `src/App.tsx` — banner render pattern (read directly) [VERIFIED]
- `src/i18n.ts` — existing key patterns, no `firestoreNotEnabled` key (read directly) [VERIFIED]
- `.github/workflows/deploy.yml` — Node 20, npm ci pattern (read directly) [VERIFIED]
- `firebase.json` — missing emulators block confirmed (read directly) [VERIFIED]
- `package.json` — `"type": "module"` confirmed; firebase-admin absent from root (read directly) [VERIFIED]
- `functions/package.json` — firebase-admin ^12.4.0, Node 20 (read directly) [VERIFIED]

### Secondary (MEDIUM confidence)
- [benmvp.com: Firebase Admin SDK env vars](https://www.benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/) — JSON.parse from env var pattern
- [Firebase Emulator CI guide](https://medium.com/firebase-developers/run-continuous-integration-tests-using-the-firebase-emulator-suite-9090cefefd69) — `emulators:exec` sets FIRESTORE_EMULATOR_HOST automatically
- [Full Stack Wizardry: Firebase Admin in Vitest](https://medium.com/full-stack-engineer/how-to-initialise-firebase-admin-in-vitest-da1053741bed) — `environment: 'node'` requirement
- [GitHub Actions cron syntax guide](https://cronjobpro.com/blog/github-actions-scheduled-workflows) — `*/15 * * * *`, UTC, delay caveats

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified from npm registry and codebase files
- Architecture: HIGH — data model confirmed from codebase; Admin SDK patterns from official docs
- Pitfalls: HIGH — ESM/CJS conflict and firebase-admin absence confirmed by direct file reads; emulators gap confirmed by reading firebase.json
- GitHub Actions cron: HIGH — `*/15 * * * *` is standard cron syntax

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days)
