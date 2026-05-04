# Milestones — Todo Witek

## v1.0 — Core Feature Completion

**Shipped:** 2026-04-28
**Phases:** 2 | **Plans:** 8 | **Tests:** 115 (110 unit + 5 integration)

### Delivered

Full push notification support and cross-device reminder delivery via GitHub Actions cron — the app now works end-to-end with real Firebase.

### Key Accomplishments

1. FCM token registration, permission UI (PushToggle), Firestore token storage — 9 tests
2. usePushNotifications state machine: unconfigured → enabled/disabled — 12 tests
3. Vite writeBundle plugin stamps firebase-messaging-sw.js with real config at build time
4. Foreground FCM banner rendered before offline/error banners in Shell
5. Firestore `permission-denied` surfaces as actionable banner pointing to console.firebase.google.com
6. GitHub Actions cron (`*/15 * * * *`) sends FCM for due reminders; 30-min look-back window, stale token cleanup, mark-fired write-back — 5 integration tests against Firestore emulator

### Known Deferred Items at Close: 2

See STATE.md Deferred Items — live FCM device tests (require real browser) and FIREBASE_SERVICE_ACCOUNT_KEY GitHub secret setup (user action required).

## v1.1 — Mobile Redesign

**Shipped:** 2026-05-04
**Phases:** 7 | **Plans:** 30 | **Tests:** 372 (was 136 at v1.0 ship → +236)

### Delivered

Mobile-first dark-theme redesign of the entire app to the locked hifi spec — Tailwind v4 token system with OKLCH colors, drawer-based category navigation, per-row overflow menu with inline edit and 2-step delete, bottom-sheet reminders, settings sheet with 5-color accent picker, and a redesigned three-screen auth flow. All Polish copy. Existing functional features (offline-first Firestore, push, reminder cron, local mode) preserved end-to-end.

### Key Accomplishments

1. **Phase 3** — Tailwind v4 + OKLCH @theme tokens; typed 5-accent palette with Polish labels; `useAccent` hook with localStorage + Firestore (`users/{uid}/preferences/accent`) reconciliation and 250ms debounced cloud writes — 46 tests
2. **Phase 4** — Full main-list rebuild: AppBar / CategoryTabsBar (animated underline) / AddTodoRow / TodoRow with reminder badge / OpenTodoList (dnd-kit long-press 250ms drag) / DoneSection (collapsed default) / EmptyState; `Intl.RelativeTimeFormat('pl')` + `useNow` 30s tick — 55 tests
3. **Phase 5** — Slide-in drawer with scrim, swipe-close (pointer-event threshold + velocity), focus management, `inert` for trap leakage prevention — 25 tests
4. **Phase 6** — PopoverMenu anchored to ••• with backdrop/Esc; InlineEdit (mobile-first blur-cancel, trim/reject empty/dedupe identical); 2-step inline delete with 2s timer keyed by todo id — 28 tests
5. **Phase 7** — Generic Sheet primitive (drag-down dismiss via vertical pointer hook, scrim, focus management); RemindersSheet with `Intl.DateTimeFormat('pl-PL')` formatter; native `HTMLInputElement.showPicker()` for datetime; preserved 15-min snap as extracted util — 48 tests
6. **Phase 8** — SettingsSheet with grouped cards (Account, Wygląd accent picker, Przechowywanie segmented, Powiadomienia push toggle, Install); deletes legacy StorageModeToggle/PushToggle/InstallButton — 34 tests
7. **Phase 9** — Three-screen auth flow (LoginScreen / ResetPasswordScreen / ResetSentScreen) with local state-machine AuthRouter; `Użyj trybu lokalnego` link enters local mode; deletes legacy Login — 29 tests

### Known Deferred Items at Close: 30

All 30 items are `human_needed` visual/device confirmations (animations 180–240ms feel, swipe gesture thresholds, native datetime-local picker behavior across iOS/Android/desktop, real Firebase login flow, push permission OS prompt). See `.planning/milestones/v1.1-MILESTONE-AUDIT.md` for the full per-phase checklist. Plus one minor code item: PopoverMenu scroll-out-of-viewport auto-close not wired (low impact — click-outside already closes).
