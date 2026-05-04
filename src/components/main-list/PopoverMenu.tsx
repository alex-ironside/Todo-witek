import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PopoverMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface PopoverMenuProps {
  open: boolean;
  anchorRect: DOMRect | null;
  items: PopoverMenuItem[];
  onClose: () => void;
}

// Anchored popover rendered into document.body so it escapes overflow:hidden
// ancestors. Positioned below the anchor (4px gap) and right-aligned to it.
// Closes on Esc, backdrop click, or when the parent clears `open`. Item
// clicks do NOT auto-close — the parent owns close so flows like the 2-step
// delete confirm can keep the menu open between taps.
export default function PopoverMenu({
  open,
  anchorRect,
  items,
  onClose,
}: PopoverMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const top = anchorRect.bottom + 4;
  const right = Math.max(8, window.innerWidth - anchorRect.right);

  return createPortal(
    <>
      <div
        data-testid="popover-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-[60]"
      />
      <div
        data-testid="popover-menu"
        role="menu"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ top: `${top}px`, right: `${right}px`, width: '200px' }}
        className="fixed z-[61] bg-bgSheet border border-hairline rounded-field shadow-[0_12px_40px_oklch(0_0_0/0.5)] py-1"
      >
        {items.map((item, i) => (
          <button
            key={`${item.label}-${i}`}
            type="button"
            role="menuitem"
            onClick={item.onClick}
            className={`w-full h-11 px-3 text-left text-base flex items-center ${
              item.danger ? 'text-danger' : 'text-text'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
