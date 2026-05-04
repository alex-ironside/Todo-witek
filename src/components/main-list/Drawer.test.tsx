import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Drawer from './Drawer';

const baseProps = {
  identity: 'me@example.com',
  selectedCategory: 'prywatne' as const,
  counts: { prywatne: 3, sluzbowe: 1 },
  onSelectCategory: vi.fn(),
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Drawer', () => {
  it('renders both category labels with counts', () => {
    const { getByText } = render(<Drawer open {...baseProps} />);
    expect(getByText('Prywatne')).toBeInTheDocument();
    expect(getByText('Służbowe')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getByText('1')).toBeInTheDocument();
  });

  it('renders identity in header', () => {
    const { getByText } = render(<Drawer open {...baseProps} />);
    expect(getByText('me@example.com')).toBeInTheDocument();
    expect(getByText('Todo')).toBeInTheDocument();
  });

  it('renders Kategorie section label and Ustawienia row', () => {
    const { getByText } = render(<Drawer open {...baseProps} />);
    expect(getByText('Kategorie')).toBeInTheDocument();
    expect(getByText('Ustawienia')).toBeInTheDocument();
  });

  it('when closed: panel has -translate-x-full and aria-hidden', () => {
    const { container } = render(<Drawer open={false} {...baseProps} />);
    const panel = container.querySelector('aside');
    expect(panel).not.toBeNull();
    expect(panel?.className).toMatch(/-translate-x-full/);
    expect(panel?.getAttribute('aria-hidden')).toBe('true');
    expect(panel?.hasAttribute('inert')).toBe(true);
  });

  it('when open: panel has translate-x-0 and no aria-hidden true', () => {
    const { container } = render(<Drawer open {...baseProps} />);
    const panel = container.querySelector('aside');
    expect(panel?.className).toMatch(/translate-x-0/);
    expect(panel?.getAttribute('aria-hidden')).toBe('false');
    expect(panel?.hasAttribute('inert')).toBe(false);
  });

  it('clicking the scrim fires onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Drawer open {...baseProps} onClose={onClose} />
    );
    fireEvent.click(getByTestId('drawer-scrim'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc closes only when open', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open={false} {...baseProps} onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    rerender(<Drawer open {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a category row fires onSelectCategory and onClose', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <Drawer
        open
        {...baseProps}
        onSelectCategory={onSelect}
        onClose={onClose}
      />
    );
    fireEvent.click(getByText('Służbowe'));
    expect(onSelect).toHaveBeenCalledWith('sluzbowe');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking Ustawienia fires onOpenSettings and onClose', () => {
    const onOpenSettings = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <Drawer
        open
        {...baseProps}
        onOpenSettings={onOpenSettings}
        onClose={onClose}
      />
    );
    fireEvent.click(getByText('Ustawienia'));
    expect(onOpenSettings).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('marks the active category row with aria-current=page', () => {
    const { getByText } = render(
      <Drawer open {...baseProps} selectedCategory="sluzbowe" />
    );
    const sluRow = getByText('Służbowe').closest('button');
    expect(sluRow?.getAttribute('aria-current')).toBe('page');
    const privRow = getByText('Prywatne').closest('button');
    expect(privRow?.getAttribute('aria-current')).toBeNull();
  });
});
