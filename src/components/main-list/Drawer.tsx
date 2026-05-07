import { useEffect, useRef, type RefObject } from 'react';
import { t } from '../../i18n';
import type { Category, TodoCategory } from '../../types';
import CategoryDrawerRow from './CategoryDrawerRow';
import { useSwipeClose } from '../../hooks/useSwipeClose';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  identity: string;
  selectedCategory: TodoCategory;
  onSelectCategory: (cat: TodoCategory) => void;
  counts: Record<TodoCategory, number>;
  categories: Category[];
  onManageCategories?: () => void;
  onOpenSettings?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const noop = (): void => {};

// Always-mounted left slide-in drawer with scrim. Closed state is reached
// via transform offscreen (transition smooth) plus `inert` to prevent focus
// from leaking into hidden controls. Esc-to-close is active only while open.
// Focus moves into the drawer on open and returns to the supplied ref
// (typically the AppBar hamburger) on close.
export default function Drawer({
  open,
  onClose,
  identity,
  selectedCategory,
  onSelectCategory,
  counts,
  categories,
  onManageCategories = noop,
  onOpenSettings = noop,
  returnFocusRef,
}: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const firstRowRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const { dragX } = useSwipeClose(panelRef, onClose, open);

  // Esc closes only when open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus management: into drawer on open, back to opener on close.
  useEffect(() => {
    if (open) {
      firstRowRef.current?.focus();
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      returnFocusRef?.current?.focus();
      wasOpenRef.current = false;
    }
  }, [open, returnFocusRef]);

  const handleSelect = (cat: TodoCategory) => {
    onSelectCategory(cat);
    onClose();
  };

  const handleManage = () => {
    onManageCategories();
    onClose();
  };

  const handleSettings = () => {
    onOpenSettings();
    onClose();
  };

  // React 18's HTMLAttributes don't yet declare `inert`; spread it
  // conditionally so strict TS stays happy without a module augmentation.
  const inertProp: { inert?: '' } = open ? {} : { inert: '' };

  // While open, follow the finger via inline transform; otherwise let the
  // Tailwind class drive the offscreen position so the slide animation runs.
  const panelStyle =
    open && dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined;

  return (
    <>
      <div
        data-testid="drawer-scrim"
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 transition-opacity duration-[240ms] motion-reduce:duration-0 z-40 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        ref={panelRef}
        aria-hidden={open ? 'false' : 'true'}
        aria-label={t.categories}
        style={panelStyle}
        className={`fixed inset-y-0 left-0 w-[80%] max-w-[320px] bg-bg flex flex-col
                    transform transition-transform duration-[240ms] ease-out motion-reduce:duration-0 z-50
                    shadow-[12px_0_32px_oklch(0_0_0/0.35)]
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
        {...inertProp}
      >
        <header className="px-4 pt-5 pb-3 border-b border-hairlineSoft">
          <div className="text-xl font-semibold text-text">{t.brand}</div>
          {identity && (
            <div className="text-textDim text-sm mt-1 truncate">{identity}</div>
          )}
        </header>
        <button
          ref={firstRowRef}
          type="button"
          onClick={handleManage}
          className="w-full flex items-center gap-3 px-4 min-h-[44px] text-left text-text border-b border-hairlineSoft"
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
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span className="text-base font-medium">{t.manageCategories}</span>
        </button>
        <div className="px-4 pt-4 pb-2 text-textMute text-xs uppercase tracking-wide font-semibold">
          {t.categories}
        </div>
        <nav className="flex flex-col overflow-y-auto">
          {categories.map((cat) => (
            <CategoryDrawerRow
              key={cat.id}
              label={cat.name}
              count={counts[cat.id] ?? 0}
              active={selectedCategory === cat.id}
              onSelect={() => handleSelect(cat.id)}
            />
          ))}
        </nav>
        <div className="mt-auto border-t border-hairlineSoft">
          <button
            type="button"
            onClick={handleSettings}
            className="w-full flex items-center gap-3 px-4 min-h-[44px] text-left text-text"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            <span className="text-base font-medium">{t.settings}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
