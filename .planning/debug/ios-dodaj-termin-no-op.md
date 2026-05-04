---
slug: ios-dodaj-termin-no-op
status: resolved
trigger: when tapping "dodaj termin" nothing happens on ios
created: 2026-05-04
updated: 2026-05-04
---

# Symptoms

- Platform: iOS Safari (and likely iOS PWA / standalone)
- Action: tap "Dodaj termin" button inside the Reminders sheet
- Expected: native datetime-local picker opens
- Actual: nothing happens; no error visible to user

# Current Focus

hypothesis: iOS Safari does not implement `HTMLInputElement.showPicker()` for `type="datetime-local"`. `RemindersSheet.tsx:38` calls `el.showPicker?.()`. On iOS the method is undefined → optional chain silently no-ops. The visible button has no other side effect, so the tap appears dead.
test: render the sheet, ensure tapping the affordance opens the OS picker via a *real* input element receiving the user gesture (not a programmatic `.showPicker()`).
expecting: the input element itself overlays the button area so the actual touch event lands on a real `<input type="datetime-local">`, which iOS Safari handles natively.
next_action: write failing test asserting the input is positioned over the button, then refactor RemindersSheet to overlay the input instead of relying on showPicker.

# Evidence

- 2026-05-04: `RemindersSheet.tsx:38` uses `el.showPicker?.()` with try/catch swallow.
- 2026-05-04: input is `sr-only`, `tabIndex={-1}`, `aria-hidden` — fully hidden from iOS hit-testing.
- 2026-05-04: caniuse / MDN: `HTMLInputElement.showPicker()` is not supported for `datetime-local` on Safari iOS as of 2025; optional-chain call no-ops.

# Eliminated

(none yet)

# Resolution

root_cause: iOS Safari does not implement `HTMLInputElement.showPicker()` for `type="datetime-local"`. The previous implementation called `el.showPicker?.()` on a visually-hidden (`sr-only`, `tabIndex={-1}`, `aria-hidden`) input. On iOS the optional-chained method was undefined, so the call was a silent no-op — tap appeared dead.
fix: Restructured the affordance so the real `<input type="datetime-local">` is absolutely positioned over a non-interactive visual button (`pointer-events: none` on the label, `opacity: 0` + `cursor: pointer` on the input). Touches now land directly on a real input element, and the OS opens its native picker through standard input activation — no JS API required.
verification: Unit tests green (372/372). Vitest, typecheck, build all pass. Verified end-to-end via Playwright (iPhone UA, 390×844, touch): Reminders sheet opened via Więcej akcji → Przypomnij; `document.elementFromPoint` at the centre of the visible "Dodaj termin" affordance returns the datetime-local input; tap focuses it (`document.activeElement.type === 'datetime-local'`); zero console errors.
files_changed:
  - src/components/main-list/RemindersSheet.tsx
  - src/components/main-list/RemindersSheet.test.tsx

