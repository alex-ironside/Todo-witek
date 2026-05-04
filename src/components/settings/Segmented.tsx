interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
}

// Two-or-more option segmented pill. Active segment uses bg-bgRaised on a
// bg-bg track; inactive segments are transparent. No animation — instant
// swap matches the locked design prototype.
export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex bg-bg border border-hairlineSoft rounded-field p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={`px-3 py-1 text-sm rounded-[10px] transition-colors ${
              active
                ? 'bg-bgRaised text-text'
                : 'text-textDim'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
