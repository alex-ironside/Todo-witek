import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import CategoryDrawerRow from './CategoryDrawerRow';

describe('CategoryDrawerRow', () => {
  it('renders label and count', () => {
    const { getByText } = render(
      <CategoryDrawerRow label="Prywatne" count={3} active={false} onSelect={() => {}} />
    );
    expect(getByText('Prywatne')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
  });

  it('active row has accent border + raised background', () => {
    const { getByRole } = render(
      <CategoryDrawerRow label="Prywatne" count={0} active onSelect={() => {}} />
    );
    const btn = getByRole('button');
    expect(btn.className).toMatch(/border-accent/);
    expect(btn.className).toMatch(/bg-bgRaised/);
    expect(btn.getAttribute('aria-current')).toBe('page');
  });

  it('inactive row omits accent border + raised background', () => {
    const { getByRole } = render(
      <CategoryDrawerRow label="Prywatne" count={0} active={false} onSelect={() => {}} />
    );
    const btn = getByRole('button');
    expect(btn.className).not.toMatch(/border-accent/);
    expect(btn.className).not.toMatch(/bg-bgRaised/);
    expect(btn.getAttribute('aria-current')).toBeNull();
  });

  it('click fires onSelect', () => {
    const spy = vi.fn();
    const { getByRole } = render(
      <CategoryDrawerRow label="Służbowe" count={1} active={false} onSelect={spy} />
    );
    fireEvent.click(getByRole('button'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('has 44pt min hit target', () => {
    const { getByRole } = render(
      <CategoryDrawerRow label="x" count={0} active={false} onSelect={() => {}} />
    );
    expect(getByRole('button').className).toMatch(/min-h-\[44px\]/);
  });
});
