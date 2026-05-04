# Phase 8: Settings Screen — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Mode:** Interactive (designs locked; no questions needed)

<canonical_refs>

- `redesign/design_handoff_todo_witek/README.md` — section "4. Settings (`settings`)".
- `redesign/design_handoff_todo_witek/app.jsx` — `SettingsSheet` (line 374).
- `.planning/REQUIREMENTS.md` — SET-01..SET-06 binding.
- `.planning/phases/03-theme-tokens-accent-system/03-CONTEXT.md` — `useAccent` hook + `ACCENTS` palette consumed by the picker.
- `.planning/phases/05-drawer-categories/05-CONTEXT.md` — `MainList` provides `onOpenSettings` (no-op default; this phase wires it).
- `src/hooks/useStorageMode.ts`, `usePushNotifications.ts`, `usePwaInstall.ts`, `useAuth.ts` — existing hooks consumed unchanged.
- `src/components/main-list/Sheet.tsx` (Phase 7) — settings open as a sheet OR full screen; design uses sheet (line 463 of app.jsx wraps in `<Sheet>`). We use the same Sheet primitive.

</canonical_refs>

<domain>

## Phase Boundary

Settings UI rendered as a bottom sheet (per app.jsx line 463), grouped cards: Account, Wygląd (accent picker), Przechowywanie (storage segmented), Powiadomienia push, Install. Wires Phase 5's `onOpenSettings` placeholder.

**Note:** The spec README describes "back chevron + title" suggesting a full screen, but the locked design prototype (`app.jsx`) uses a sheet for parity with reminders. We follow the prototype: sheet with title + close-button (acting as the back affordance). This is consistent with the rest of the redesign and avoids introducing routing for one screen.

**In scope:**
- `src/components/settings/SettingsSheet.tsx` — composer.
- `src/components/settings/SettingsGroup.tsx` — `bg-bgRaised` rounded-group card with title + children.
- `src/components/settings/AccountGroup.tsx` — email + Wyloguj button.
- `src/components/settings/AppearanceGroup.tsx` — Kolor akcentu row + 5-swatch picker.
- `src/components/settings/StorageGroup.tsx` — Lokalnie/Chmura segmented control.
- `src/components/settings/PushGroup.tsx` — toggle + status text.
- `src/components/settings/InstallGroup.tsx` — install row, hidden when installed.
- `MainList.tsx` updated: owns `settingsOpen: boolean`, wires `onOpenSettings={() => setSettingsOpen(true)}`.
- `<MainList>` consumes `useAccent` and passes `[accent, setAccent]` to SettingsSheet.
- i18n additions: `settings: 'Ustawienia'`, `loggedInAs: 'Zalogowany jako'`, `signOut: 'Wyloguj'` (already exists), `appearance: 'Wygląd'`, `accentColor: 'Kolor akcentu'`, `storage: 'Przechowywanie'`, `local: 'Lokalnie'`, `cloud: 'Chmura'`, `pushTitle: 'Powiadomienia push'`, `pushHelper: 'Przypomnienia działają, gdy aplikacja jest zamknięta.'`, `pushOn: 'Włączone'`, `pushOff: 'Wyłączone'`, `installTitle: 'Zainstaluj aplikację'`, `installHelper: 'Dodaj do ekranu początkowego, aby otwierać szybciej.'`.

**Out of scope:**
- Auth flows (Phase 9).
- Density picker (REQUIREMENTS out-of-scope).

</domain>

<decisions>

## Implementation Decisions

### Surface — sheet, not full screen

Per the locked prototype. Reuses the `<Sheet>` primitive from Phase 7 for visual + interaction consistency. Title: `Ustawienia`. Drag-down or scrim-tap dismisses. `Anuluj` button at bottom.

### Account group

```tsx
<SettingsGroup title="">
  <Row>
    <Col>
      <span className="text-textDim text-sm">{t.loggedInAs}</span>
      <span className="text-text">{user.email}</span>
    </Col>
    <button onClick={signOut} className="text-danger">{t.signOut}</button>
  </Row>
</SettingsGroup>
```

In local mode the entire AccountGroup is hidden (no email, no signOut). The settings sheet still shows the rest.

### Appearance group — 5-swatch accent picker

Read `[accent, setAccent] = useAccent()` (passed in from MainList).

```tsx
<SettingsGroup title={t.appearance}>
  <div className="flex justify-between items-center">
    <span>{t.accentColor}</span>
    <div className="flex gap-2">
      {ACCENT_KEYS.map(key => (
        <button
          key={key}
          aria-label={ACCENTS[key].label}
          onClick={() => setAccent(key)}
          className={`w-8 h-8 rounded-full ${accent === key ? 'ring-2 ring-accent ring-offset-2 ring-offset-bgRaised' : ''}`}
          style={{ backgroundColor: ACCENTS[key].oklch }}
        />
      ))}
    </div>
  </div>
</SettingsGroup>
```

`style` is the only non-Tailwind escape: each swatch uses its own OKLCH directly (Tailwind doesn't dynamically resolve runtime variables to per-element backgrounds). Acceptable: 5 fixed values, no drift risk.

### Storage group — segmented control

```tsx
<SettingsGroup title={t.storage}>
  <Segmented value={mode} onChange={setMode}>
    <Segment value="local">{t.local}</Segment>
    <Segment value="firebase">{t.cloud}</Segment>
  </Segmented>
</SettingsGroup>
```

`Segmented` is a small inline component (or under `src/components/main-list/Segmented.tsx`): two buttons in a `bg-bg` pill, active one has `bg-bgRaised` + accent-colored underline or filled. ~30 lines.

`useStorageMode` already returns `[mode, setMode]`. Existing `StorageModeToggle` is deleted after the new control replaces it.

### Push group

Read `usePushNotifications(user.uid)` (passed in from MainList — for local mode, no-op).

```tsx
<SettingsGroup title="">
  <Col>
    <Row justifyBetween>
      <span>{t.pushTitle}</span>
      <Switch
        checked={push.status === 'enabled'}
        onChange={async (next) => next ? await push.enable() : await push.disable()}
      />
    </Row>
    <span className="text-textDim text-sm">{t.pushHelper}</span>
    <span className="text-textDim text-xs">{push.status === 'enabled' ? t.pushOn : t.pushOff}</span>
  </Col>
</SettingsGroup>
```

`<Switch>` is a small custom component (`bg-bgRaised` track, `bg-accent` knob translates).

Existing `PushToggle` component is replaced by this group.

### Install group

```tsx
const { installable, install, isInstalled } = usePwaInstall();
if (isInstalled) return null;
return (
  <SettingsGroup>
    <Row onClick={install}>
      <Col>
        <span>{t.installTitle}</span>
        <span className="text-textDim text-sm">{t.installHelper}</span>
      </Col>
      <ChevronRight />
    </Row>
  </SettingsGroup>
);
```

Existing `InstallButton` deleted; this group covers SET-06.

### Local-mode handling

When `mode === 'local'` (or no auth user), AccountGroup and PushGroup are hidden. AppearanceGroup, StorageGroup (still shows segmented), and InstallGroup remain.

### TDD

- `Segmented.test.tsx` — selects, changes, fires onChange.
- `Switch.test.tsx` — toggles, calls onChange with next bool.
- `AccountGroup.test.tsx` — renders email + Wyloguj; click calls signOut.
- `AppearanceGroup.test.tsx` — 5 swatches, click changes accent (mock useAccent), active swatch has ring class.
- `StorageGroup.test.tsx` — toggles via segmented control.
- `PushGroup.test.tsx` — switch reflects status, toggling calls enable/disable.
- `InstallGroup.test.tsx` — hidden when installed; click calls install.
- `SettingsSheet.test.tsx` — composes all groups; opens via prop; closes via scrim/Esc/Anuluj.
- `MainList.test.tsx` (extended) — clicking AppBar cog opens SettingsSheet.

</decisions>

<code_context>

## Existing Code Insights

- `usePushNotifications` returns `{ status, enable, disable, bannerMessage }` — fits the Switch wrapper directly.
- `usePwaInstall` returns `{ canInstall, install }` plus an `isInstalled` flag (check current API; if missing, derive from `display-mode: standalone` MQ).
- `StorageModeToggle`, `PushToggle`, `InstallButton` from `src/components/` are all deleted in this phase after replacements ship.

</code_context>

<specifics>

## Specific Ideas

- Group cards: `bg-bgRaised rounded-group p-4`, gap between groups: `space-y-4`.
- Accent swatch ring: 2px in `--color-accent`, 2px gap from swatch.
- Switch: 36×20 track, 16×16 knob, 200ms transition.
- Sheet height: contents-driven, max-h-[85vh] with scroll.

</specifics>

<deferred>

## Deferred Ideas

- **About / version footer** — not in spec.
- **Language picker** — Polish-only product.
- **Density picker** — out of scope.

</deferred>
