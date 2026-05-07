import { t } from '../i18n';

// First-load splash for the PWA. Reuses the favicon's checkmark icon: a
// stroke enters from bottom-left as a straight line, rearranges into the
// check by dipping the middle vertex, holds, then flattens back into a
// line that slides off to the top-right. The morph keyframes live in
// index.css under @keyframes loadingCheck. The animation loops in case
// auth / hydration takes longer than a single 2s cycle.
export default function LoadingCheck() {
  return (
    <div
      role="status"
      aria-label={t.loading}
      className="fixed inset-0 grid place-items-center bg-bg"
    >
      <svg
        viewBox="0 0 64 64"
        width="160"
        height="160"
        aria-hidden="true"
        style={{ overflow: 'hidden' }}
      >
        <rect width="64" height="64" rx="12" fill="#1f2937" />
        <path
          d="M16 34l10 10 22-22"
          stroke="#22d3ee"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: 'loadingCheck 2s ease-in-out infinite' }}
        />
      </svg>
    </div>
  );
}
