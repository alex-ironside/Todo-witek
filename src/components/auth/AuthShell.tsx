import type { ReactNode } from 'react';
import { t } from '../../i18n';

interface Props {
  children: ReactNode;
}

// Centered shell for the auth screens: brand mark on top, content below.
export default function AuthShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="text-3xl font-semibold mb-8 text-text">{t.brand}</div>
      {children}
    </div>
  );
}
