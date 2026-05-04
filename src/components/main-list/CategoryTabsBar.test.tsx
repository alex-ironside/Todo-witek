import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import CategoryTabsBar from './CategoryTabsBar';

describe('CategoryTabsBar', () => {
  it('renders Prywatne and Służbowe tabs', () => {
    const { getByRole } = render(
      <CategoryTabsBar value="prywatne" onChange={() => {}} />
    );
    expect(getByRole('tab', { name: 'Prywatne' })).toBeInTheDocument();
    expect(getByRole('tab', { name: 'Służbowe' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    const { getByRole } = render(
      <CategoryTabsBar value="prywatne" onChange={() => {}} />
    );
    expect(getByRole('tab', { name: 'Prywatne' })).toHaveAttribute('aria-selected', 'true');
    expect(getByRole('tab', { name: 'Służbowe' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the new category when inactive tab clicked', () => {
    const spy = vi.fn();
    const { getByRole } = render(
      <CategoryTabsBar value="prywatne" onChange={spy} />
    );
    fireEvent.click(getByRole('tab', { name: 'Służbowe' }));
    expect(spy).toHaveBeenCalledWith('sluzbowe');
  });

  it('renders an animated underline element with transition classes', () => {
    const { getByTestId } = render(
      <CategoryTabsBar value="prywatne" onChange={() => {}} />
    );
    const underline = getByTestId('tab-underline');
    expect(underline.className).toMatch(/transition-\[transform,width\]/);
    expect(underline.className).toMatch(/motion-reduce:transition-none/);
    expect(underline.getAttribute('style') || '').toMatch(/translateX\(0%\)/);
  });

  it('translates the underline to the right tab when sluzbowe is active', () => {
    const { getByTestId } = render(
      <CategoryTabsBar value="sluzbowe" onChange={() => {}} />
    );
    const underline = getByTestId('tab-underline');
    expect(underline.getAttribute('style') || '').toMatch(/translateX\(100%\)/);
  });
});
