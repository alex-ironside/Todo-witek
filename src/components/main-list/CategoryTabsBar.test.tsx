import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import CategoryTabsBar from './CategoryTabsBar';
import type { Category } from '../../types';

const seedCats: Category[] = [
  { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
  { id: 'sluzbowe', ownerId: 'u', name: 'Służbowe' },
];

describe('CategoryTabsBar', () => {
  it('renders one tab per category', () => {
    const { getByRole } = render(
      <CategoryTabsBar
        value="prywatne"
        onChange={() => {}}
        categories={seedCats}
      />
    );
    expect(getByRole('tab', { name: 'Prywatne' })).toBeInTheDocument();
    expect(getByRole('tab', { name: 'Służbowe' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    const { getByRole } = render(
      <CategoryTabsBar
        value="prywatne"
        onChange={() => {}}
        categories={seedCats}
      />
    );
    expect(getByRole('tab', { name: 'Prywatne' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(getByRole('tab', { name: 'Służbowe' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('calls onChange with the new category when inactive tab clicked', () => {
    const spy = vi.fn();
    const { getByRole } = render(
      <CategoryTabsBar value="prywatne" onChange={spy} categories={seedCats} />
    );
    fireEvent.click(getByRole('tab', { name: 'Służbowe' }));
    expect(spy).toHaveBeenCalledWith('sluzbowe');
  });

  it('renders an animated underline element with transition classes', () => {
    const { getByTestId } = render(
      <CategoryTabsBar
        value="prywatne"
        onChange={() => {}}
        categories={seedCats}
      />
    );
    const underline = getByTestId('tab-underline');
    expect(underline.className).toMatch(/transition-\[transform,width\]/);
    expect(underline.className).toMatch(/motion-reduce:transition-none/);
    expect(underline.getAttribute('style') || '').toMatch(/translateX\(0%\)/);
  });

  it('translates the underline to the active tab when the second category is selected', () => {
    const { getByTestId } = render(
      <CategoryTabsBar
        value="sluzbowe"
        onChange={() => {}}
        categories={seedCats}
      />
    );
    const underline = getByTestId('tab-underline');
    expect(underline.getAttribute('style') || '').toMatch(/translateX\(100%\)/);
  });

  it('renders user-defined categories beyond the seed list', () => {
    const cats: Category[] = [
      ...seedCats,
      { id: 'hobby', ownerId: 'u', name: 'Hobby' },
    ];
    const { getByRole } = render(
      <CategoryTabsBar value="hobby" onChange={() => {}} categories={cats} />
    );
    expect(getByRole('tab', { name: 'Hobby' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('sizes the underline to 1/N of the tablist width', () => {
    const cats: Category[] = [
      ...seedCats,
      { id: 'hobby', ownerId: 'u', name: 'Hobby' },
      { id: 'extra', ownerId: 'u', name: 'Extra' },
    ];
    const { getByTestId } = render(
      <CategoryTabsBar value="hobby" onChange={() => {}} categories={cats} />
    );
    const underline = getByTestId('tab-underline');
    expect(underline.getAttribute('style') || '').toMatch(/width: 25%/);
    expect(underline.getAttribute('style') || '').toMatch(/translateX\(200%\)/);
  });
});
