// Single source of truth for the 5 user-selectable accent colors.
// Keys are internal English; labels are Polish (per design spec).
// Values mirror redesign/design_handoff_todo_witek/README.md exactly.

export const ACCENTS = {
  amber:  { oklch: 'oklch(0.78 0.13 70)',  ink: 'oklch(0.20 0.020 60)', label: 'Bursztyn' },
  rose:   { oklch: 'oklch(0.74 0.13 18)',  ink: 'oklch(0.20 0.020 60)', label: 'Róż' },
  mint:   { oklch: 'oklch(0.78 0.11 165)', ink: 'oklch(0.20 0.020 60)', label: 'Mięta' },
  violet: { oklch: 'oklch(0.72 0.13 290)', ink: 'oklch(0.20 0.020 60)', label: 'Fiolet' },
  sky:    { oklch: 'oklch(0.78 0.10 235)', ink: 'oklch(0.20 0.020 60)', label: 'Błękit' },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export const DEFAULT_ACCENT: AccentKey = 'amber';

export const ACCENT_KEYS: readonly AccentKey[] = ['amber', 'rose', 'mint', 'violet', 'sky'];
