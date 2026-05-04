# Phase 9: Auth Flow Redesign — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive (designs locked; no questions needed)

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — sections "5. Login (`login`)", "6. Reset password (`reset`)", "7. Reset — sent (`reset-sent`)".
- `redesign/design_handoff_todo_witek/app.jsx` — login/reset/reset-sent screens.
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-03 binding.
- `src/components/Login.tsx` and `Login.test.tsx` — current implementation.
- `src/firebase/auth.ts` — exposes `login`, `logout`, `observeAuth`, `resetPassword`. No SDK changes.
- `src/services/storageMode.ts` — `setStorageMode('local')` is what `Użyj trybu lokalnego` calls.
- `.planning/phases/03-theme-tokens-accent-system/03-CONTEXT.md` — token utilities.

</canonical_refs>

<domain>

## Phase Boundary

Three-screen auth flow — login, reset password, reset-sent — matching spec. Preserves the email/password-only constraint (no public sign-up) and adds the `Użyj trybu lokalnego` text link from the login screen.

**In scope:**
- `src/components/auth/AuthShell.tsx` — common centered layout (brand mark + content).
- `src/components/auth/LoginScreen.tsx` — replaces existing `Login.tsx`.
- `src/components/auth/ResetPasswordScreen.tsx`.
- `src/components/auth/ResetSentScreen.tsx`.
- `src/components/auth/AuthRouter.tsx` — minimal state machine: `'login' | 'reset' | 'reset-sent'`.
- App.tsx `FirebaseApp`: when `!user`, render `<AuthRouter onUseLocal={() => onModeChange('local')} />` instead of the old `<Login>`.
- i18n additions: `loginTitle: 'Zaloguj się'`, `loginHint: 'Bez publicznej rejestracji.'`, `loginEmail: 'E-mail'`, `loginPassword: 'Hasło'`, `loginSubmit: 'Zaloguj'`, `loginForgot: 'Nie pamiętasz hasła?'`, `loginUseLocal: 'Użyj trybu lokalnego'`, `resetTitle: 'Resetuj hasło'`, `resetHint: 'Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła.'`, `resetSubmit: 'Wyślij link resetujący'`, `resetSubmitBusy: 'Wysyłanie…'`, `resetEmptyError: 'Podaj adres e-mail'`, `resetSentTitle: 'Sprawdź skrzynkę'`, `resetSentBody: 'Wysłaliśmy link do zresetowania hasła na podany adres. Link wygasa po godzinie.'`, `resetBack: 'Wróć do logowania'`.
- Delete `src/components/Login.tsx` and `Login.test.tsx` after replacements ship.

**Out of scope:**
- Sign-up flow (explicitly excluded by spec).
- Social sign-in (Google, Apple, etc.) — CLAUDE.md forbids without explicit instruction.
- Password strength meter / change-password flow.

</domain>

<decisions>

## Implementation Decisions

### Routing — local state machine, no router

A single `useState<'login' | 'reset' | 'reset-sent'>('login')` in `AuthRouter`. Three transitions:
- login → reset (clicking `Nie pamiętasz hasła?`)
- reset → reset-sent (after successful `sendPasswordResetEmail`)
- reset-sent → login (clicking `Wróć do logowania`)
- reset → login (back chevron)

No URL changes. No router dep. Same pattern as Phase 8's settings sheet (local state for ephemeral UI).

### Layout — centered, brand on top

`AuthShell` renders the brand mark "Todo" at the top and centers the children vertically:

```tsx
<div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
  <div className="text-3xl font-semibold mb-8">Todo</div>
  {children}
</div>
```

Each screen passes its own form/content as children.

### Login screen

```tsx
<form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
  <h1 className="text-2xl font-semibold">{t.loginTitle}</h1>
  <p className="text-textDim">{t.loginHint}</p>
  <Field label={t.loginEmail} type="email" value={email} onChange={setEmail} />
  <Field label={t.loginPassword} type="password" value={password} onChange={setPassword} />
  {error && <span className="text-danger text-sm">{error}</span>}
  <button type="submit" className="w-full bg-accent text-accentInk rounded-field py-3">{t.loginSubmit}</button>
  <div className="flex flex-col items-center gap-2 text-textDim">
    <button type="button" onClick={onForgot}>{t.loginForgot}</button>
    <button type="button" onClick={onUseLocal}>{t.loginUseLocal}</button>
  </div>
</form>
```

Submit handler: empty email or password → inline `--danger` error beneath the offending field. On `login()` rejection (Firebase error) → show error message in the same slot.

`Field` is an inline subcomponent: `bg-bgRaised`, `rounded-field`, 16px text, label above input.

### Reset password screen

```tsx
<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
  <BackButton onClick={onBack} />
  <h1 className="text-2xl font-semibold">{t.resetTitle}</h1>
  <p className="text-textDim">{t.resetHint}</p>
  <Field label={t.loginEmail} type="email" value={email} onChange={setEmail} />
  {error && <span className="text-danger text-sm">{error}</span>}
  <button type="submit" disabled={busy} className="w-full bg-accent text-accentInk rounded-field py-3 disabled:opacity-60">
    {busy ? t.resetSubmitBusy : t.resetSubmit}
  </button>
</form>
```

Empty email → inline `t.resetEmptyError`. Successful `resetPassword(email)` → `setMode('reset-sent')`. Errors → display in error slot.

### Reset-sent screen

```tsx
<div className="w-full max-w-sm space-y-6 text-center">
  <h1 className="text-2xl font-semibold">{t.resetSentTitle}</h1>
  <p className="text-textDim">{t.resetSentBody}</p>
  <button onClick={onBackToLogin} className="w-full border border-hairline text-accent rounded-field py-3">
    {t.resetBack}
  </button>
</div>
```

Note the secondary outlined style (no fill, accent text, hairline border) per spec.

### `Użyj trybu lokalnego` integration

`AuthRouter` receives `onUseLocal` from App.tsx, which calls `onModeChange('local')`. This flips storage mode and unmounts AuthRouter (FirebaseApp re-renders into LocalApp branch).

### Empty-validation pattern

For both login email/password and reset email: validate on submit, show inline error in `text-danger` beneath the offending field. Clear on next change to that field.

### TDD

- `LoginScreen.test.tsx` — renders all elements; empty email → error; empty password → error; click forgot → `onForgot()`; click use-local → `onUseLocal()`; submit calls `login(email, password)`; failed login shows error.
- `ResetPasswordScreen.test.tsx` — renders; empty email → `resetEmptyError`; submit calls `resetPassword(email)`, busy state during pending, success → `onSent()`, error shows.
- `ResetSentScreen.test.tsx` — renders both copy strings; back button calls `onBackToLogin`.
- `AuthRouter.test.tsx` — initial state login; transitions login→reset→reset-sent→login work.
- `App.test.tsx` (extended) — when no auth user in firebase mode, AuthRouter renders.

</decisions>

<code_context>

## Existing Code Insights

- `firebase/auth.ts` already exports `resetPassword(email)` — wraps `sendPasswordResetEmail`.
- Existing `Login.tsx` already accepts `mode` and `onModeChange` props — the new AuthRouter inherits this contract.
- The "use local mode" button is just `onModeChange('local')`. No auth state cleanup needed (we're not signed in).
- Form submission pattern with Firebase errors: catch `FirebaseError`, map `code` to user-friendly message. The existing Login.tsx has this; reuse the mapping logic.

</code_context>

<specifics>

## Specific Ideas

- All forms `max-w-sm` (~384px) so they don't stretch awkwardly on tablets.
- BackButton: chevron-left icon (inline SVG) + text-textDim, 44px hit target.
- Submit button busy state: `disabled:opacity-60` per spec (~60% alpha).

</specifics>

<deferred>

## Deferred Ideas

- **Magic link / passwordless** — not in spec.
- **2FA** — not in spec.
- **Show password toggle** — not in spec.

</deferred>
