import { useEffect, useRef, type ReactNode } from 'react';
import { useDragToDismiss } from '../../hooks/useDragToDismiss';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Reusable bottom-sheet primitive. Always mounted; uses CSS transforms to
// slide in/out. Closed state is `translate-y-full` plus `inert` so focus
// can't leak into hidden controls — same pragmatic pattern as Drawer.
// Esc, scrim click, and downward drag (via useDragToDismiss) all close.
// Focus moves into the panel on open and restores on close. We do NOT
// implement Tab cycling here — Drawer doesn't either; consistency wins,
// browser-only verification flagged.
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const { dragY } = useDragToDismiss(panelRef, onClose, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      const panel = panelRef.current;
      if (panel) {
        const focusable = panel.querySelector<HTMLElement>(
          'button,input,a,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        (focusable ?? panel).focus();
      }
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      previouslyFocusedRef.current?.focus?.();
      wasOpenRef.current = false;
    }
  }, [open]);

  const inertProp: { inert?: '' } = open ? {} : { inert: '' };
  const panelStyle =
    open && dragY !== 0 ? { transform: `translateY(${dragY}px)` } : undefined;

  return (
    <>
      <div
        data-testid="sheet-backdrop"
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 transition-opacity duration-[220ms] motion-reduce:duration-0 z-40 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={panelStyle}
        className={`fixed inset-x-0 bottom-0 max-h-[85vh] bg-bgSheet rounded-t-sheet
                    shadow-[0_-12px_32px_oklch(0_0_0/0.35)] z-50 flex flex-col
                    transform transition-transform duration-[220ms] ease-out
                    motion-reduce:duration-0
                    ${open ? 'translate-y-0' : 'translate-y-full'}`}
        {...inertProp}
      >
        <div
          data-testid="sheet-handle"
          aria-hidden="true"
          className="mx-auto mt-2 mb-3 w-10 h-1 rounded-full bg-hairline"
        />
        <div className="px-5 pb-3 text-text font-semibold text-lg">{title}</div>
        <div className="overflow-auto px-5 pb-6 flex-1">{children}</div>
      </div>
    </>
  );
}
