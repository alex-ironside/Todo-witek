interface Props {
  onClick: () => void;
  label: string;
}

// Chevron-left + label, sized for a 44pt mobile hit target.
export default function BackButton({ onClick, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-textDim h-11 inline-flex items-center gap-1 -ml-2 px-2"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span className="text-sm">{label}</span>
    </button>
  );
}
