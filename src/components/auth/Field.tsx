import { useId } from 'react';

interface Props {
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  id?: string;
}

// Labelled text input used by every auth screen. Label sits above the
// input; the input uses the raised surface token so it visually separates
// from the page background.
export default function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  id,
}: Props) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="text-textDim text-sm mb-1 block"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bgRaised text-text rounded-field px-3 py-3 text-base w-full outline-none"
      />
    </div>
  );
}
