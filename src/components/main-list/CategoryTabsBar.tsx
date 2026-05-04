import { TODO_CATEGORIES, type TodoCategory } from '../../types';
import { t } from '../../i18n';

interface CategoryTabsBarProps {
  value: TodoCategory;
  onChange: (next: TodoCategory) => void;
}

const labelFor = (cat: TodoCategory): string =>
  cat === 'prywatne' ? t.tabPrywatne : t.tabSluzbowe;

// Two segmented tabs with a single absolutely-positioned accent underline
// that translates between tabs over 180ms. Single span avoids re-mounting
// on tab switch so the transition runs naturally.
export default function CategoryTabsBar({ value, onChange }: CategoryTabsBarProps) {
  return (
    <div role="tablist" className="relative flex border-b border-hairlineSoft bg-bg" aria-label={t.categoryGroupLabel}>
      {TODO_CATEGORIES.map((cat) => {
        const selected = cat === value;
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat)}
            className={`flex-1 h-11 text-base font-medium ${selected ? 'text-text' : 'text-textDim'}`}
          >
            {labelFor(cat)}
          </button>
        );
      })}
      <span
        data-testid="tab-underline"
        className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[transform,width] [transition-duration:180ms] ease-in-out motion-reduce:transition-none"
        style={{
          width: '50%',
          transform: value === 'prywatne' ? 'translateX(0%)' : 'translateX(100%)',
        }}
      />
    </div>
  );
}
