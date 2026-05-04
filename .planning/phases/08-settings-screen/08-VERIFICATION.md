---
status: human_needed
score: 6/6
---

# Phase 8 — Verification

## Automated

- `npm test -- --run` — 372 tests pass (was 338).
- `npm run typecheck` — clean.
- `npm run build` — clean.

## Requirement coverage

| Req | Where verified |
|-----|----------------|
| SET-01 | `SettingsSheet.test.tsx` — title `Ustawienia`, sheet open/close. |
| SET-02 | `AccountGroup.test.tsx` — email + `Wyloguj` in `text-danger`. |
| SET-03 | `AppearanceGroup.test.tsx` — 5 swatches, active ring, OKLCH styles. |
| SET-04 | `StorageGroup.test.tsx` — Lokalnie/Chmura segmented, internal values. |
| SET-05 | `PushGroup.test.tsx` — switch, status text, hide in inert states. |
| SET-06 | `InstallGroup.test.tsx` — hidden when `canInstall=false`. |

## Human-verifiable items (browser only)

1. **Live accent swap** — open settings, tap a non-active swatch;
   verify `--accent` propagates immediately (Switch knob, active tab
   underline, Dodaj button) and active ring jumps to the new swatch.
2. **Push permission OS prompt** — toggle the push Switch on; the
   browser/OS permission dialog should appear; on grant the Switch
   stays on and status reads `Włączone`.
3. **Install prompt visibility** — when the app is launched in
   `display-mode: standalone` (already installed), the Install group
   should not render. In a regular browser tab on Chromium, after the
   `beforeinstallprompt` event fires, the Install row should appear.
4. **Segmented control feel** — flipping `Lokalnie`/`Chmura` should
   feel instant; verify the active segment swap has correct
   `bg-bgRaised` highlight and surrounding chrome reflows without
   jitter.
5. **Sheet drag-to-dismiss + Esc** — pull down on the sheet to close;
   Esc closes; scrim tap closes. Focus returns to the cog.
