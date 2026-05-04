interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}

// Controlled toggle. Track is bg-bgRaised; knob is bg-accent and slides
// 16px in 200ms when checked. accent is a CSS var, so swatch changes
// flow through automatically.
export default function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={`relative inline-flex w-9 h-5 rounded-full bg-bgRaised border border-hairlineSoft
                  transition-colors ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-4 h-4 rounded-full bg-accent
                    transition-transform duration-200 motion-reduce:duration-0
                    ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  );
}
