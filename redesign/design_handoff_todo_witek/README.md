# Handoff: Todo Witek — Mobile Redesign

## Overview
This is a clarity-first redesign of **Todo Witek**, a Polish-language personal todo app for mobile (iOS + Android). The redesign focuses on:
- A refined dark theme with a single warm accent color
- Sidebar/drawer-based categories
- All per-row actions consolidated under a `• • •` overflow menu
- An auto-collapsed "Wykonane" (Done) section
- Sheet-based reminders and settings
- A quiet, unobtrusive empty state

The package covers seven screens across two platforms (iOS, Android): main list, drawer (categories), reminders sheet, settings, login, password reset, and reset-sent confirmation.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive React-in-the-browser prototypes showing the intended look and behavior. They are **not production code** and should not be shipped as-is.

The task is to **recreate these designs in the target app's existing environment** (e.g. React Native, SwiftUI, Jetpack Compose, Flutter, native iOS/Android, or whatever stack the Todo Witek codebase uses), following its established patterns, libraries, and conventions. If no environment exists yet, choose the most appropriate framework for a Polish-language mobile todo app and implement there.

The HTML mocks render two phone frames (iOS and Android) side-by-side via a "design canvas" component — that canvas chrome is for review only and is **not** part of the product UI. The product UI is everything **inside** the phone bezels.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interactions are all locked in. Recreate pixel-perfectly using the codebase's existing libraries.

## Language
All user-facing copy is in **Polish**. Exact strings are in the "Copy" section below — do not retranslate; use the strings as-is. The `pl` lang attribute is set on the document.

## Screens / Views

All screens are mobile-only, designed for ~390pt iPhone and ~411dp Android viewports. Background of the app is `--bg` (warm near-black). Status bar and home indicator areas come from the OS shell, not the product UI.

### 1. Main list (`main`)
**Purpose**: Primary screen. User sees their todos for the active category, adds new ones, and manages existing ones.

**Layout (top to bottom)**:
- **App bar**: hamburger (opens drawer) on the left, brand "Todo" centered or left-aligned, settings cog on the right. Height ~56pt. Hairline divider below.
- **Category tabs**: two segmented tabs — `Prywatne` (Personal) and `Służbowe` (Work). Active tab shows accent-colored underline (2px) and `--text` color; inactive uses `--textDim`.
- **Add input row**: full-width text field with placeholder `Co dziś robisz?` and a primary `Dodaj` button on the right. Input has `--bgRaised` background, 12px radius. Button uses accent color with `--accentInk` text.
- **Open todos list**: vertically stacked rows, each:
  - Tap target ≥ 44pt
  - Left: round checkbox (unchecked = hairline border; checked = filled accent with checkmark)
  - Center: todo title in `--text`, 16px, weight 500
  - Right: `• • •` overflow icon (opens action menu: Edytuj, Przypomnij, Usuń)
  - If todo has reminders: small accent-tinted bell + relative time below the title in `--textDim` 13px
  - Hairline divider between rows (`--hairlineSoft`)
- **Done section** (collapsed by default): a clickable header `Wykonane (n)` with a chevron. Expands to show completed todos rendered with strikethrough and `--textDim` color.
- **Empty state** (when no todos in active category): centered, quiet — `Brak zadań.` in `--textDim`, sub-line `Dodaj pierwsze powyżej.` in `--textMute`. No illustration.

**Per-row overflow menu** (`• • •`): bottom sheet or popover with three items:
- `Edytuj` — opens inline edit on the row
- `Przypomnij` — opens reminders sheet for this todo
- `Usuń` — confirms with `Na pewno?` then deletes

### 2. Drawer — Categories (`drawer`)
**Purpose**: Switch between categories.

**Layout**: Slides in from the left, ~80% screen width, scrim over the rest of the screen.
- Header: brand "Todo" + small user email line (signed in identity) in `--textDim`.
- Section title `Kategorie` in `--textMute`, 12px, uppercase tracking.
- Two list rows: `Prywatne` and `Służbowe`. Active category has accent vertical bar (3px wide) on the left edge and `--bgRaised` background.
- Each row shows the count of open todos on the right in `--textDim`.
- Footer: settings cog → `Ustawienia` row, hairline above.

### 3. Reminders sheet (`reminder`)
**Purpose**: Manage reminders for a single todo.

**Layout**: Bottom sheet, rounded top corners (24px), `--bgSheet` background, drag handle at top.
- Sheet title: `Przypomnienia` in `--text`, 18px weight 600. Below it the todo title in `--textDim`.
- List of existing reminders. Each row: bell icon + formatted date/time + `wysłane` badge if `fired === true` (badge uses `--textDim` and a hairline pill outline). Trailing `×` to remove.
- If empty: `Bez przypomnień.` in `--textDim`, centered.
- Primary action button at the bottom: `Dodaj termin` in accent.
- Secondary close action: `Anuluj`.

### 4. Settings (`settings`)
**Purpose**: Account, storage mode, push, install.

**Layout**: Full screen with back chevron + title `Ustawienia`. Grouped list rows on `--bgRaised` cards (16px radius, 16px gap between groups).

Groups:
- **Account**: row showing `Zalogowany jako` + email beneath. Trailing `Wyloguj` button (text-only, `--danger` color).
- **Wygląd (Appearance)**: `Kolor akcentu` row → opens 5-swatch picker (`Bursztyn`, `Róż`, `Mięta`, `Fiolet`, `Błękit`). Active swatch has accent ring around it.
- **Przechowywanie (Storage)**: segmented control with two options — `Lokalnie` and `Chmura`.
- **Powiadomienia push**: toggle row. Title `Powiadomienia push`, helper text `Przypomnienia działają, gdy aplikacja jest zamknięta.` in `--textDim` 13px, switch on the right. Status reads `Włączone` / `Wyłączone`.
- **Install**: row with title `Zainstaluj aplikację` and helper `Dodaj do ekranu początkowego, aby otwierać szybciej.` Trailing chevron.

### 5. Login (`login`)
**Purpose**: Sign in. **No public registration** is offered (per `loginHint`).

**Layout**: Centered vertically.
- Brand "Todo" mark, large.
- Title `Zaloguj się` (24px, weight 600).
- Hint `Bez publicznej rejestracji.` in `--textDim`.
- Two fields stacked: `E-mail`, `Hasło`. Field style: `--bgRaised`, 12px radius, 16px text.
- Primary button `Zaloguj` — full width, accent.
- Two text links beneath, centered:
  - `Nie pamiętasz hasła?` → goes to reset flow
  - `Użyj trybu lokalnego` → enters app in local-only mode (no auth)

### 6. Reset password (`reset`)
**Purpose**: Request a reset link.

**Layout**: Same vertical centering as login.
- Back chevron + title `Resetuj hasło`.
- Hint `Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła.` in `--textDim`.
- Single `E-mail` field.
- Primary button `Wyślij link resetujący`. Busy state label: `Wysyłanie…` (button disabled, accent fades to ~60% alpha).
- Validation: empty email shows inline `Podaj adres e-mail` in `--danger`.

### 7. Reset — sent (`reset-sent`)
**Purpose**: Confirmation that the email was sent.

**Layout**:
- Title `Sprawdź skrzynkę`.
- Body `Wysłaliśmy link do zresetowania hasła na podany adres. Link wygasa po godzinie.` in `--textDim`.
- Button `Wróć do logowania` (secondary style — outlined, accent text on transparent bg with hairline border).

## Interactions & Behavior

### Navigation
- **Drawer**: slide in from left, 240ms ease-out. Scrim fades to ~50% opacity over the rest. Tap scrim or swipe-left to dismiss.
- **Bottom sheets** (reminders, overflow menu): slide up from bottom, 220ms ease-out, with backdrop fade. Drag-down to dismiss.
- **Tab switch**: instant content swap; underline animates 180ms.
- **Login → Reset → Reset sent**: standard push transitions (right-to-left).

### Add todo
- Type into input, tap `Dodaj` or press Enter.
- New todo appended to the bottom of the open list with a subtle slide+fade-in (160ms).
- Input clears, retains focus.

### Toggle done
- Tap checkbox → checkbox fills with accent + checkmark, row title gets strikethrough and `--textDim` color, then 200ms later moves into the (collapsed) `Wykonane` section.

### Delete
- Tap `• • •` → `Usuń` → button label changes to `Na pewno?` for 2s; second tap confirms. (Two-step inline confirm; no modal.)
- Optional: swipe-left on a row reveals a red `Usuń` action.

### Reminders
- Tap `• • •` → `Przypomnij` opens the reminders sheet for that todo.
- `Dodaj termin` opens the OS-native date+time picker.
- Reminders that already fired show the `wysłane` badge and are non-removable (kept for history) — or removable, follow the codebase's existing pattern.

### Push toggle
- Toggling on triggers the OS permission flow. If permission denied, switch flips back and shows an inline hint linking to system settings.

### Form validation
- Login: both fields required. Show inline error in `--danger` beneath the offending field.
- Reset: email required (`Podaj adres e-mail`); basic format check.

### Animations summary
| Trigger | Property | Duration | Easing |
|---|---|---|---|
| Drawer open/close | transform translateX | 240ms | ease-out |
| Bottom sheet open/close | transform translateY + backdrop opacity | 220ms | ease-out |
| Tab underline | transform translateX + width | 180ms | ease-in-out |
| Add todo entry | opacity + translateY(8px → 0) | 160ms | ease-out |
| Toggle done | color + text-decoration cross-fade | 200ms | ease-out |
| Tab/section reorder | FLIP layout transition | 220ms | ease-in-out |

## State Management

Per-user app state:
- `todos: Todo[]` — `{ id, title, done, category: 'prywatne' \| 'sluzbowe', reminders: Reminder[] }`
- `reminders: { id, remindAt: epoch_ms, fired: boolean }[]` (nested under each todo)
- `activeCategory: 'prywatne' \| 'sluzbowe'`
- `doneCollapsed: boolean` (default `true`)
- `drawerOpen: boolean`
- `activeSheet: null \| 'reminders' \| 'overflow'`
- `editingTodoId: string \| null`

App-level settings:
- `accent: 'amber' \| 'rose' \| 'mint' \| 'violet' \| 'sky'`
- `density: 'compact' \| 'balanced' \| 'airy'` (the prototype exposes this; product can ship just `balanced` if not needed)
- `storageMode: 'local' \| 'cloud'`
- `pushEnabled: boolean`
- `auth: { email: string \| null, mode: 'local' \| 'cloud' }`

Auth flow state machine: `loggedOut → login → main` ; `login → reset → reset-sent → login` ; `loggedOut → main` (via `Użyj trybu lokalnego`).

Data fetching: when `storageMode === 'cloud'`, sync todos against the existing Todo Witek backend. When `local`, persist to platform-appropriate local store (Keychain/UserDefaults, SharedPreferences, AsyncStorage, etc.).

## Design Tokens

All colors use **OKLCH**. If the target platform doesn't support OKLCH natively, convert to the closest hex and document the conversion.

### Colors
| Token | OKLCH | Notes |
|---|---|---|
| `--bg` | `oklch(0.18 0.008 60)` | App background, warm near-black |
| `--bgRaised` | `oklch(0.22 0.009 60)` | Cards, input fields, raised rows |
| `--bgSheet` | `oklch(0.24 0.010 60)` | Bottom sheets |
| `--hairline` | `oklch(0.30 0.008 60)` | Strong divider |
| `--hairlineSoft` | `oklch(0.26 0.008 60)` | Row dividers |
| `--text` | `oklch(0.96 0.005 80)` | Primary text |
| `--textDim` | `oklch(0.72 0.012 70)` | Secondary text |
| `--textMute` | `oklch(0.55 0.010 70)` | Tertiary, placeholder, hints |
| `--accentInk` | `oklch(0.20 0.020 60)` | Text/icon color on accent fill |
| `--danger` | `oklch(0.65 0.18 25)` | Destructive actions, errors |

### Accent palette (single accent at a time, user-selectable)
| Name | OKLCH |
|---|---|
| Amber (default) | `oklch(0.78 0.13 70)` |
| Rose | `oklch(0.74 0.13 18)` |
| Mint | `oklch(0.78 0.11 165)` |
| Violet | `oklch(0.72 0.13 290)` |
| Sky | `oklch(0.78 0.10 235)` |

All accents share lightness ≈ 0.74–0.78 and chroma ≈ 0.10–0.13 — only hue varies. Maintain this constraint if adding more accents.

### Typography
- **Family**: Inter (web prototype). On native, use the platform default (San Francisco on iOS, Roboto on Android) or Inter if the codebase already ships it.
- **Scale**:
  - Title L: 24px / 600
  - Title M: 18px / 600
  - Body: 16px / 500 (todo titles, primary fields)
  - Body sm: 14px / 500
  - Caption: 13px / 500 (helpers, reminder time)
  - Overline: 12px / 600 uppercase tracking 0.04em (section labels like `Kategorie`)

### Spacing scale
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 (px). Default vertical rhythm between sections is 16; row internal padding is 12 vertical / 16 horizontal.

### Border radius
- Field, button, row card: 12px
- Group card: 16px
- Sheet: 24px (top corners only)
- Checkbox, swatch: 999px (circle)

### Shadows
The design is mostly shadow-less, leaning on hairlines and surface elevation via `--bgRaised`/`--bgSheet`. The only shadow is on bottom sheets and the drawer:
- Sheet/drawer: `0 -12px 32px oklch(0 0 0 / 0.35)` (sheet uses negative y; drawer uses `12px 0 32px` etc.)

### Density variants
The prototype exposes `compact / balanced / airy`. Ship `balanced` unless told otherwise:
- Compact: row vertical padding 8, section gap 12
- Balanced: row vertical padding 12, section gap 16
- Airy: row vertical padding 16, section gap 24

## Copy (Polish — exact strings)

Use these strings verbatim. Source of truth is the `PL` object in `app.jsx`.

| Key | String |
|---|---|
| brand | Todo |
| tabPrywatne | Prywatne |
| tabSluzbowe | Służbowe |
| todoPlaceholder | Co dziś robisz? |
| add | Dodaj |
| empty | Brak zadań. |
| emptyHint | Dodaj pierwsze powyżej. |
| done | Wykonane |
| edit | Edytuj |
| delete | Usuń |
| deleteConfirm | Na pewno? |
| remind | Przypomnij |
| cancel | Anuluj |
| save | Zapisz |
| reminderTitle | Przypomnienie |
| reminderEmpty | Bez przypomnień. |
| reminderAdd | Dodaj termin |
| reminderFired | wysłane |
| settings | Ustawienia |
| signedInAs | Zalogowany jako |
| signOut | Wyloguj |
| modeLocal | Lokalnie |
| modeCloud | Chmura |
| storage | Przechowywanie |
| pushTitle | Powiadomienia push |
| pushHint | Przypomnienia działają, gdy aplikacja jest zamknięta. |
| pushOn | Włączone |
| pushOff | Wyłączone |
| install | Zainstaluj aplikację |
| installHint | Dodaj do ekranu początkowego, aby otwierać szybciej. |
| categories | Kategorie |
| loginTitle | Zaloguj się |
| loginHint | Bez publicznej rejestracji. |
| email | E-mail |
| password | Hasło |
| loginSubmit | Zaloguj |
| forgotPassword | Nie pamiętasz hasła? |
| useLocal | Użyj trybu lokalnego |
| reminders | Przypomnienia |
| appearance | Wygląd |
| accentLabel | Kolor akcentu |
| accentAmber | Bursztyn |
| accentRose | Róż |
| accentMint | Mięta |
| accentViolet | Fiolet |
| accentSky | Błękit |
| resetTitle | Resetuj hasło |
| resetHint | Podaj adres e-mail powiązany z kontem. Wyślemy link do zresetowania hasła. |
| resetSubmit | Wyślij link resetujący |
| resetSubmitBusy | Wysyłanie… |
| resetSuccessTitle | Sprawdź skrzynkę |
| resetSuccessBody | Wysłaliśmy link do zresetowania hasła na podany adres. Link wygasa po godzinie. |
| resetBack | Wróć do logowania |
| resetEmailRequired | Podaj adres e-mail |

## Assets
The prototype uses **no raster images and no custom icons**. All glyphs (hamburger, settings cog, checkbox, chevron, bell, `• • •`) are drawn inline as small SVGs or unicode. In the target codebase, replace these with whichever icon system is already in use (SF Symbols on iOS, Material Symbols on Android, or the codebase's existing set). Recommended equivalents:

| Glyph | iOS SF Symbol | Material Symbol |
|---|---|---|
| Hamburger | `line.3.horizontal` | `menu` |
| Settings | `gearshape` | `settings` |
| Checkbox unchecked | `circle` | `radio_button_unchecked` |
| Checkbox checked | `checkmark.circle.fill` | `check_circle` |
| Overflow | `ellipsis` | `more_horiz` |
| Chevron | `chevron.right` / `chevron.down` | `chevron_right` / `expand_more` |
| Bell | `bell` | `notifications` |
| Back | `chevron.left` | `arrow_back` |

Font: Inter via Google Fonts in the prototype only. Native targets should use the platform default; web targets can keep Inter.

## Files in this bundle
- `Todo Witek Redesign.html` — the entry HTML, sets up React + Babel and renders the design canvas with all 7 screens × 2 platforms.
- `app.jsx` — all product UI: `IOSPhone`, `AndroidPhone`, screen components, the `PL` copy dictionary, the `tokens()` color builder, and the seed data.
- `ios-frame.jsx`, `android-frame.jsx` — non-product device bezels (status bar, home indicator, etc.). Reference only — do not port.
- `design-canvas.jsx`, `tweaks-panel.jsx` — design-review chrome (pan/zoom canvas, tweaks panel for switching accent/density/visible screens). Reference only — do not port.

To run the prototype locally: open `Todo Witek Redesign.html` in any modern browser. Everything is client-side.

## Implementation order (suggested)
1. Lock the token system (colors, type, spacing, radii) into the codebase's theme.
2. Build the **main list** screen first — checkbox row, add input, tabs, done collapse, empty state.
3. Add the **drawer** for category switching.
4. Add the **overflow menu** + delete two-step + inline edit.
5. Build the **reminders sheet** and wire up local notifications.
6. Build **settings** screen + accent picker + storage toggle + push toggle.
7. Build **login → reset → reset-sent** auth flow last (gate `main` behind it unless local mode).

## Out of scope for this redesign
- Public sign-up flow (intentionally absent — `Bez publicznej rejestracji.`)
- Onboarding tour
- Multi-device sync conflict UI
- Sharing / collaboration
- More than two categories (can be added later but the drawer should accommodate it)
