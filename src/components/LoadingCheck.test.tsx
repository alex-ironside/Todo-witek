import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingCheck from './LoadingCheck';
import { t } from '../i18n';

describe('LoadingCheck', () => {
  it('exposes a status role with the loading label for assistive tech', () => {
    render(<LoadingCheck />);
    const status = screen.getByRole('status');
    expect(status).toHaveAccessibleName(t.loading);
  });

  it('renders the check icon path used by the PWA favicon', () => {
    const { container } = render(<LoadingCheck />);
    const path = container.querySelector('path[d="M16 34l10 10 22-22"]');
    expect(path).toBeTruthy();
  });

  it('uses a 2s animation that loops while loading lasts longer than the cycle', () => {
    const { container } = render(<LoadingCheck />);
    const path = container.querySelector('path[d="M16 34l10 10 22-22"]') as SVGPathElement | null;
    expect(path).toBeTruthy();
    // Inline style drives the keyframe so the duration is verifiable without
    // reaching into a stylesheet that jsdom doesn't apply.
    expect(path?.getAttribute('style') || '').toMatch(/animation:[^;]*\b2s\b/);
    expect(path?.getAttribute('style') || '').toMatch(/infinite/);
  });
});
