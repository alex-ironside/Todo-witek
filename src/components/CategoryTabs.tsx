import { TODO_CATEGORIES, type TodoCategory } from '../types';
import { t } from '../i18n';

interface Props {
  value: TodoCategory;
  onChange: (next: TodoCategory) => void;
}

const labelFor = (cat: TodoCategory): string =>
  cat === 'prywatne' ? t.tabPrywatne : t.tabSluzbowe;

export default function CategoryTabs({ value, onChange }: Props) {
  return (
    <div className="row" role="tablist" aria-label={t.categoryGroupLabel}>
      {TODO_CATEGORIES.map((cat) => {
        const selected = cat === value;
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? 'primary' : 'ghost'}
            onClick={() => onChange(cat)}
          >
            {labelFor(cat)}
          </button>
        );
      })}
    </div>
  );
}
