import type { Category, TodoCategory } from '../../types';
import { t } from '../../i18n';

interface CategoryTabsBarProps {
  value: TodoCategory;
  onChange: (next: TodoCategory) => void;
  categories: Category[];
}

// Segmented tabs with a single absolutely-positioned accent underline that
// translates between tabs over 180ms. Tabs are rendered horizontally and
// scroll if there are more than fit; the underline width and offset are
// derived from the active index so the animation stays smooth.
export default function CategoryTabsBar({
  value,
  onChange,
  categories,
}: CategoryTabsBarProps) {
  const count = categories.length;
  const activeIndex = Math.max(
    0,
    categories.findIndex((c) => c.id === value)
  );
  const widthPct = count > 0 ? 100 / count : 100;
  return (
    <div
      role="tablist"
      className="relative flex border-b border-hairlineSoft bg-bg overflow-x-auto"
      aria-label={t.categoryGroupLabel}
    >
      {categories.map((cat) => {
        const selected = cat.id === value;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat.id)}
            className={`flex-1 min-w-[96px] h-11 text-base font-medium ${
              selected ? 'text-text' : 'text-textDim'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
      {count > 0 && (
        <span
          data-testid="tab-underline"
          className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[transform,width] [transition-duration:180ms] ease-in-out motion-reduce:transition-none"
          style={{
            width: `${widthPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      )}
    </div>
  );
}
