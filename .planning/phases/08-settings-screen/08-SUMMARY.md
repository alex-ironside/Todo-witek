# Phase 8 — Settings Screen — Summary

## What shipped

A bottom-sheet `Ustawienia` surface composed of grouped cards on
`bg-bgRaised`:

- **AccountGroup** — `Zalogowany jako` + email + `Wyloguj`
  (text-`danger`). Hidden in local mode (`email === null`).
- **AppearanceGroup** — `Kolor akcentu` row + 5-swatch picker. Active
  swatch wears `ring-2 ring-accent ring-offset-2 ring-offset-bgRaised`.
  Each swatch's background is the OKLCH from `theme/accents.ts`
  applied via inline `style` (the only non-Tailwind escape, by design).
- **StorageGroup** — `Lokalnie` / `Chmura` segmented control wired to
  `useStorageMode` (internal values `'local' | 'firebase'`).
- **PushGroup** — Switch + helper + Włączone/Wyłączone status. Hidden
  when `push` is null or status is `'unconfigured' | 'unsupported'`.
- **InstallGroup** — chevron row that fires the captured PWA prompt;
  hidden when `usePwaInstall().canInstall === false`.

Composed by `SettingsSheet` (Phase 7's `Sheet` primitive — drag-down,
Esc, scrim-tap dismiss).

## Wiring

- `MainList` now owns `settingsOpen` state and calls `useAccent` +
  `useStorageMode` itself, then renders `<SettingsSheet>`. The cog in
  AppBar opens it.
- `App.tsx` passes `email`, `onSignOut`, `push`, `canInstall`,
  `onInstall` down into MainList. The temporary footer strip
  (StorageModeToggle + PushToggle + InstallButton) is gone.
- `usePwaInstall` is read inside `Shell` so install prompts work in
  both local and Firebase apps.

## Removed

- `src/components/StorageModeToggle.tsx`
- `src/components/PushToggle.tsx` (+ test)
- `src/components/InstallButton.tsx`
- The temporary `Shell` footer markup (`row` of toggles + email +
  Wyloguj button).

## i18n additions

`signedInAs`, `appearance`, `accentLabel`, `storage`, `pushTitle`,
`pushHelper`, `pushOn`, `pushOff`, `installTitle`, `installHelper`.
No collisions: existing `signOut`, `modeLocal`, `modeCloud`,
`settings`, `installApp` were not touched.

## Plans + commits

| Plan | Commit |
|------|--------|
| 01 | `feat(08): Switch + Segmented primitives + settings i18n` |
| 02 | `feat(08): SettingsGroup container + AccountGroup` |
| 03 | `feat(08): AppearanceGroup accent picker + StorageGroup segmented` + `fix(08): collapse OKLCH zeros in AppearanceGroup test for jsdom` |
| 04 | `feat(08): PushGroup + InstallGroup` |
| 05 | `feat(08): SettingsSheet composer + MainList wiring + remove legacy toggles` |

## Test delta

338 → 372 (+34). All passing. `npm run typecheck` and `npm run build`
clean.

## Notes for the next phase

- `AuthRouter` (Phase 9) will replace the current login UI; the
  `email`/`signOut` plumbing in App.tsx is already shaped for it.
- The previously temporary `Shell` footer is fully removed — no other
  surface still mentions storage / push / install toggles.
