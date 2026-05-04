interface CategoryDrawerRowProps {
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

// Single category row in the drawer. Active rows show a 3px accent vertical
// bar on the left and a raised background; inactive rows reserve the same
// space with a transparent border so labels don't shift on selection.
export default function CategoryDrawerRow({
  label,
  count,
  active,
  onSelect,
}: CategoryDrawerRowProps) {
  const base =
    'w-full flex items-center justify-between px-4 min-h-[44px] text-left text-text';
  const stateCls = active
    ? 'border-l-[3px] border-accent bg-bgRaised'
    : 'border-l-[3px] border-transparent';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${stateCls}`}
    >
      <span className="text-base font-medium">{label}</span>
      <span className="text-textDim text-sm tabular-nums">{count}</span>
    </button>
  );
}
