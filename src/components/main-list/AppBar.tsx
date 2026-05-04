import { forwardRef } from 'react';
import { t } from '../../i18n';

interface AppBarProps {
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
}

// Top app bar: hamburger | brand | cog. Hairline divider below. Buttons
// have 44pt hit targets and emit prop callbacks; navigation logic lives
// in MainList's parents (Phases 5 + 8). The hamburger button ref is
// forwarded so the Drawer can return focus to it on close.
const AppBar = forwardRef<HTMLButtonElement, AppBarProps>(function AppBar(
  { onOpenDrawer, onOpenSettings },
  hamburgerRef,
) {
  return (
    <header className="h-14 flex items-center justify-between px-2 border-b border-hairlineSoft bg-bg">
      <button
        ref={hamburgerRef}
        type="button"
        aria-label={t.menuOpen}
        onClick={onOpenDrawer}
        className="w-11 h-11 grid place-items-center text-text"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
      <div className="text-text font-semibold text-lg select-none">{t.brand}</div>
      <button
        type="button"
        aria-label={t.settingsOpen}
        onClick={onOpenSettings}
        className="w-11 h-11 grid place-items-center text-text"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </button>
    </header>
  );
});

export default AppBar;
