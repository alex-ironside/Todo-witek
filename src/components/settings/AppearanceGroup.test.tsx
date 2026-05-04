import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AppearanceGroup from './AppearanceGroup';
import { ACCENTS, ACCENT_KEYS } from '../../theme/accents';

describe('AppearanceGroup', () => {
  it('renders 5 swatches with Polish aria-labels', () => {
    const { getByLabelText } = render(
      <AppearanceGroup accent="amber" onChange={() => {}} />
    );
    for (const key of ACCENT_KEYS) {
      expect(getByLabelText(ACCENTS[key].label)).toBeInTheDocument();
    }
  });

  it('active swatch has ring class', () => {
    const { getByLabelText } = render(
      <AppearanceGroup accent="rose" onChange={() => {}} />
    );
    const active = getByLabelText(ACCENTS.rose.label);
    expect(active.className).toContain('ring-2');
    const inactive = getByLabelText(ACCENTS.amber.label);
    expect(inactive.className).not.toContain('ring-2');
  });

  it('clicking a non-active swatch calls onChange with that key', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <AppearanceGroup accent="amber" onChange={onChange} />
    );
    fireEvent.click(getByLabelText(ACCENTS.mint.label));
    expect(onChange).toHaveBeenCalledWith('mint');
  });

  it('each swatch carries its OKLCH inline background-color', () => {
    const { getByLabelText } = render(
      <AppearanceGroup accent="amber" onChange={() => {}} />
    );
    // jsdom normalizes "0.10" → "0.1"; compare on collapsed-zero form.
    const collapse = (s: string) => s.replace(/(\d)\.(\d+?)0+(\D|$)/g, '$1.$2$3');
    for (const key of ACCENT_KEYS) {
      const sw = getByLabelText(ACCENTS[key].label);
      const style = sw.getAttribute('style') ?? '';
      expect(collapse(style)).toContain(collapse(ACCENTS[key].oklch));
    }
  });

  it('renders the appearance group title', () => {
    const { getByText } = render(
      <AppearanceGroup accent="amber" onChange={() => {}} />
    );
    expect(getByText('Wygląd')).toBeInTheDocument();
    expect(getByText('Kolor akcentu')).toBeInTheDocument();
  });
});
