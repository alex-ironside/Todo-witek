---
status: resolved
slug: add-input-stuck-after-submit
trigger: after clicking add, i cannot add another item
created: 2026-04-27
updated: 2026-04-27
---

## Symptoms

- expected: input keeps value, focus returns to input field after Add
- actual: after first successful Add, input stays filled and becomes unresponsive (typing ignored)
- first_item_added: true — first todo is created successfully; only subsequent adds fail
- extra_detail: "the input is stuck"

## Current Focus

hypothesis: "Clicking the submit button moves focus to the button. After the async create() resolves, focus stays on the button (now disabled). No code returned focus to the input, so subsequent keystrokes were lost."
test: "TodoForm — returns focus to the input after successful add so typing works immediately"
expecting: "inputRef.current?.focus() called after setTitle('') restores focus while input is enabled"
next_action: "done — fix verified green"
reasoning_checkpoint: "Root cause is focus management, not state management. State (title, busy) updates correctly. The input is enabled and empty after submit — it just lacks focus. Clicking a button always moves DOM focus to that button; we must explicitly restore it."
tdd_checkpoint: "RED: toHaveFocus() tests failed (focus on disabled button). GREEN: removing disabled from input + adding ref + focus() call after create() passes all 7 tests."

## Evidence

- timestamp: 2026-04-27T13:45:00Z
  finding: "TodoForm had no ref and no focus() call. After button click, focus went to the submit button and was never returned to the input."
  file: src/components/TodoForm.tsx

- timestamp: 2026-04-27T13:48:00Z
  finding: "RED confirmed: toHaveFocus() tests fail; received element with focus is the disabled submit button."
  file: src/components/TodoForm.test.tsx

- timestamp: 2026-04-27T13:50:00Z
  finding: "GREEN confirmed: removing disabled from input + adding useRef + inputRef.current?.focus() after setTitle('') makes all 7 tests pass."
  file: src/components/TodoForm.tsx

## Eliminated

- State management bug (title/busy not resetting): eliminated — setTitle('') and setBusy(false) run correctly in finally block.
- Component remounting after first add: eliminated — repo is stable via useMemo, no key change on Shell or TodoForm.
- localTodoRepo.create hanging/rejecting: eliminated — synchronous write + immediate promise resolution.
- React 18 batching issue: eliminated — all state setters are stable references, batching works correctly.
- disabled={busy} on input causing focus loss: eliminated as primary mechanism — the real trigger is clicking the button, not disabling the input. Both contributed; removing disabled from input was also correct.

## Resolution

root_cause: "Clicking the submit button moves DOM focus to the button. After the async create() resolved, no code restored focus to the input. The button becomes disabled (busy=false, title=''), but focus stays there, making the input unresponsive to typing without a mouse click."
fix: "Removed disabled={busy} from the input (keeping it only on the submit button), added useRef<HTMLInputElement>, and called inputRef.current?.focus() after setTitle('') in the try block. The input is enabled throughout, so focus() is effective immediately."
verification: "68 tests pass (npm test), typecheck clean, build succeeds."
files_changed: "src/components/TodoForm.tsx, src/components/TodoForm.test.tsx"
