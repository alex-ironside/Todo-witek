# Roadmap — Todo Witek

## Milestones

- ✅ **v1.0 Core Feature Completion** — Phases 1-2 (shipped 2026-04-28)
- 🔧 **v1.1 Mobile Redesign** — Phases 3-9 (started 2026-05-04)

## Phases

<details>
<summary>✅ v1.0 Core Feature Completion (Phases 1-2) — SHIPPED 2026-04-28</summary>

- [x] Phase 1: Push Notifications Setup (6/6 plans) — completed 2026-04-27
- [x] Phase 2: Firestore API + GitHub Actions Reminder Cron (2/2 plans) — completed 2026-04-28

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

</details>

### v1.1 Mobile Redesign

Source spec: `redesign/design_handoff_todo_witek/README.md` (locked hifi).
Phases follow the README's suggested implementation order. All copy is
Polish; tokens are OKLCH; design ships dark theme + 5 user-selectable
accents. Existing functional features must continue to work.

#### Phase 3: Theme Tokens & Accent System

**Goal:** Lock the OKLCH token system into the codebase as CSS variables +
TS constants. Add a per-user accent picker state (5 colors) that persists
across sessions and applies app-wide.

**Requirements:** THEME-01, THEME-02, THEME-03 · **Depends on:** —

**Success criteria:**
1. All token CSS variables exist on `:root` and pass smoke render tests.
2. `useAccent()` hook returns/sets one of five accents; persists in
   localStorage in local mode and Firestore user-doc in cloud mode.
3. Accent change updates `--accent` and `--accentInk` live without reload.

#### Phase 4: Main List Redesign

**Goal:** Recreate the main screen — app bar, category tabs, add row, todo
rows, Wykonane collapse, empty state — all using the new tokens. Wires to
existing `useTodos` and `useSelectedCategory` hooks.

**Requirements:** LIST-01..LIST-06 · **Depends on:** Phase 3

**Success criteria:**
1. App bar renders hamburger/brand/cog with hairline divider.
2. Category tabs animate underline on switch (180ms).
3. Add row submits via Enter and `Dodaj`, clears + retains focus.
4. Open list rows show new round checkbox + ••• overflow trigger.
5. Done section auto-collapses with `Wykonane (n)` header.
6. Empty state shows two-line Polish copy.

#### Phase 5: Drawer (Categories)

**Goal:** Slide-in left drawer with scrim for category switching, header,
and footer settings link.

**Requirements:** DRAWER-01..DRAWER-04 · **Depends on:** Phase 4

**Success criteria:**
1. Hamburger opens drawer (240ms ease-out); scrim covers rest at ~50%.
2. Tap-scrim or swipe-left dismisses.
3. Drawer header shows brand + email (or `Tryb lokalny`).
4. Active category row has accent bar + raised background.
5. Each category row shows trailing open-todo count.
6. Footer `Ustawienia` row navigates to settings screen.

#### Phase 6: Overflow Menu, Inline Edit, Two-Step Delete

**Goal:** Per-row ••• menu with Edytuj / Przypomnij / Usuń; inline edit
mode; two-step inline delete confirmation.

**Requirements:** ROW-01..ROW-04 · **Depends on:** Phase 4

**Success criteria:**
1. ••• opens action sheet/popover with three labeled items.
2. Edytuj swaps row to input + Zapisz; blur/ESC cancels.
3. Usuń: first tap shows `Na pewno?` for 2s, second tap deletes; timer
   resets if cancelled.
4. Przypomnij wires to reminders sheet (placeholder until Phase 7).

#### Phase 7: Reminders Bottom Sheet

**Goal:** Replace existing ReminderEditor with bottom sheet UI matching
spec. Preserve 15-min snapping and existing scheduler contract.

**Requirements:** REM-01..REM-05 · **Depends on:** Phase 6

**Success criteria:**
1. Sheet slides up 220ms with drag handle and backdrop fade.
2. Reminder rows show bell + formatted time; fired ones have `wysłane`
   pill badge.
3. Empty state shows `Bez przypomnień.`.
4. `Dodaj termin` opens native datetime-local picker; saved time snaps
   to 15-min boundary (regression-tested against scheduler).
5. `Anuluj` and drag-down both dismiss.

#### Phase 8: Settings Screen

**Goal:** Full settings screen with grouped cards: Account, Wygląd
(accent picker), Przechowywanie (storage segmented), Powiadomienia push,
Install. Wraps existing hooks; no new business logic.

**Requirements:** SET-01..SET-06 · **Depends on:** Phase 3, Phase 5

**Success criteria:**
1. Back chevron returns to main list.
2. Account group shows email + Wyloguj triggers logout.
3. Accent picker swatches highlight active selection; tap changes accent.
4. Storage segmented control toggles between Lokalnie / Chmura.
5. Push toggle reflects + drives `usePushNotifications` state machine.
6. Install row hides when PWA installed; otherwise triggers prompt.

#### Phase 9: Auth Flow Redesign

**Goal:** Three-screen auth flow — login, reset password, reset-sent —
matching spec. Preserves email/password-only constraint and adds the
`Użyj trybu lokalnego` link.

**Requirements:** AUTH-01..AUTH-03 · **Depends on:** Phase 3

**Success criteria:**
1. Login: brand + title + fields + primary button + two text links.
2. Inline danger error on empty submit.
3. Reset password: hint copy + email field + busy state on submit.
4. Reset-sent: confirmation copy + outlined back button returns to login.
5. Empty-email validation shows `Podaj adres e-mail`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Push Notifications Setup | v1.0 | 6/6 | Complete | 2026-04-27 |
| 2. Firestore API + GitHub Actions Cron | v1.0 | 2/2 | Complete | 2026-04-28 |
| 3. Theme Tokens & Accent System | v1.1 | 0/0 | Not started | — |
| 4. Main List Redesign | v1.1 | 0/0 | Not started | — |
| 5. Drawer | v1.1 | 0/0 | Not started | — |
| 6. Overflow Menu + Edit + Delete | v1.1 | 0/0 | Not started | — |
| 7. Reminders Bottom Sheet | v1.1 | 0/0 | Not started | — |
| 8. Settings Screen | v1.1 | 0/0 | Not started | — |
| 9. Auth Flow Redesign | v1.1 | 0/0 | Not started | — |
