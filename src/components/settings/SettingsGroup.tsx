import type { ReactNode } from 'react';

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
}

// Visual container for one settings group: bg-bgRaised card with optional
// uppercase overline title above. Pure presentation — no business logic.
export default function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <section className="bg-bgRaised rounded-group p-4">
      {title && (
        <h2
          data-testid="settings-group-title"
          className="text-textMute text-xs font-semibold uppercase tracking-wider mb-3"
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
