import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';

interface InlineEditProps {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

// Inline edit affordance for a TodoRow. Mobile-first: blur OR Esc cancels;
// Enter or Zapisz commits. Empty-after-trim is rejected with a danger ring;
// identical-after-trim short-circuits to onCancel (no-op write). The Zapisz
// button preventDefaults its mousedown so the input keeps focus until the
// click handler runs (otherwise blur-cancel would race the submit).
export default function InlineEdit({
  initialTitle,
  onSave,
  onCancel,
}: InlineEditProps) {
  const [value, setValue] = useState(initialTitle);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const submit = () => {
    const next = value.trim();
    if (!next) {
      setError(true);
      return;
    }
    if (next === initialTitle.trim()) {
      onCancel();
      return;
    }
    onSave(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(false);
        }}
        onKeyDown={onKeyDown}
        onBlur={onCancel}
        className={`flex-1 bg-bgRaised rounded-field h-11 px-3 text-text outline-none ${
          error ? 'ring-2 ring-danger' : ''
        }`}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={submit}
        className="h-11 px-4 bg-accent text-accentInk rounded-field font-medium"
      >
        {t.save}
      </button>
    </div>
  );
}
