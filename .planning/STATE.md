---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Mobile Redesign
status: Complete
last_updated: "2026-05-04T15:30:00.000Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 30
  completed_plans: 30
---

# Project State — Todo Witek

## Current Phase

v1.1 milestone shipped 2026-05-04. Awaiting next-milestone kickoff.

## Position

- Current plan: —
- Last completed: v1.1 Mobile Redesign milestone — 7 phases, 30 plans, 372 tests passing
- Stopped at: Milestone closed; ready for `/gsd-new-milestone` when planning v1.2

## Accumulated Context

### Decisions (v1.1)

- Tailwind v4 with CSS-first `@theme` directive — single source for OKLCH tokens; auto-generated utilities (bg-bg, text-textDim, …); no `tailwind.config.js`.
- Accent runtime swap via `document.documentElement.style.setProperty('--color-accent', ...)`.
- Accent persistence: `localStorage` always; cloud users get Firestore mirror at `users/{uid}/preferences/accent`. 250ms debounced cloud writes; cloud-wins on auth-ready reconcile.
- All ephemeral UI state (drawer open, popover anchor, editing id, reminders sheet, settings sheet) lives INSIDE MainList — no global store, no router.
- Drag-to-reorder: dnd-kit kept; activation switched to long-press (PointerSensor 250ms / 5px tolerance). No visible handle.
- Animations: CSS only (no framer-motion / react-spring). All respect `prefers-reduced-motion`.
- Sheet primitive (Phase 7) reused by SettingsSheet (Phase 8) — single drag-down/scrim/Esc model.
- Auth state machine local to AuthRouter — no router dep for one screen flow.
- Replaced (not deprecated) all legacy components per CLAUDE.md "no backwards-compat hacks".

## Deferred Items

Items acknowledged and deferred at v1.1 milestone close on 2026-05-04:

| Category | Item | Status |
|----------|------|--------|
| verification | Phase 03 human_needed | Live picker visual swap (now Phase 8 wired) + firestore.rules deploy verification |
| verification | Phase 04 human_needed | Animation timings (180/200/220/250ms) + relative-time tick |
| verification | Phase 05 human_needed | 240ms slide animation + swipe-close gesture + focus return |
| verification | Phase 06 human_needed | Popover positioning + 2s confirm feel + Zapisz/blur race |
| verification | Phase 07 human_needed | 220ms slide-up + drag-down threshold + showPicker() across browsers |
| verification | Phase 08 human_needed | Live accent swap + push permission OS prompt + install row visibility |
| verification | Phase 09 human_needed | Real Firebase login + reset email arrival + busy-state feedback |
| code | Phase 06 PopoverMenu scroll-out auto-close | specified in CONTEXT, not wired (low impact — click-outside already closes) |
| debug | data-is-not-synched | root_cause_found at v1.0 — Firestore API now enabled. Debug session resolved. |
| setup | FIREBASE_SERVICE_ACCOUNT_KEY | GitHub secret carry-over from v1.0 — user must configure before cron fires in production |

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260508-gp8 | Add "Zarządzaj kategoriami" button to move-to-category view | 2026-05-08 | 4898d65 | [260508-gp8-add-manage-categories-button-to-move-to-](./quick/260508-gp8-add-manage-categories-button-to-move-to-/) |

## Last Session

- Timestamp: 2026-05-08
- Stopped at: Quick task 260508-gp8 — Add manage categories button to move-to-category view
- Resume file: None
