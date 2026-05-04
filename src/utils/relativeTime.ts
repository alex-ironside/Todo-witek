// Polish-localized relative time formatter. Pure function; callers pass
// `now` so tests can freeze it. Buckets escalate by SI-ish thresholds so
// the label always reads naturally ("5 minut temu", "za 2 godziny").

const rtf = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' });

export function formatRelative(target: number, now: number): string {
  const diffSec = Math.round((target - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}
