import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import PopoverMenu from './PopoverMenu';

const fakeRect = (over: Partial<DOMRect> = {}): DOMRect => ({
  top: 100,
  bottom: 144,
  left: 200,
  right: 244,
  width: 44,
  height: 44,
  x: 200,
  y: 100,
  toJSON: () => ({}),
  ...over,
}) as DOMRect;

describe('PopoverMenu', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when open is false', () => {
    const { queryByText } = render(
      <PopoverMenu
        open={false}
        anchorRect={fakeRect()}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={() => {}}
      />
    );
    expect(queryByText('Edytuj')).toBeNull();
  });

  it('renders nothing when anchorRect is null', () => {
    const { queryByText } = render(
      <PopoverMenu
        open={true}
        anchorRect={null}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={() => {}}
      />
    );
    expect(queryByText('Edytuj')).toBeNull();
  });

  it('renders an item per items[] entry with its label', () => {
    const { getByText } = render(
      <PopoverMenu
        open={true}
        anchorRect={fakeRect()}
        items={[
          { label: 'Edytuj', onClick: () => {} },
          { label: 'Przypomnij', onClick: () => {} },
          { label: 'Usuń', onClick: () => {}, danger: true },
        ]}
        onClose={() => {}}
      />
    );
    expect(getByText('Edytuj')).toBeInTheDocument();
    expect(getByText('Przypomnij')).toBeInTheDocument();
    expect(getByText('Usuń')).toBeInTheDocument();
  });

  it('clicking an item fires its onClick and does NOT auto-close', () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <PopoverMenu
        open={true}
        anchorRect={fakeRect()}
        items={[{ label: 'Edytuj', onClick }]}
        onClose={onClose}
      />
    );
    fireEvent.click(getByText('Edytuj'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('danger items render with text-danger color class', () => {
    const { getByText } = render(
      <PopoverMenu
        open={true}
        anchorRect={fakeRect()}
        items={[{ label: 'Usuń', onClick: () => {}, danger: true }]}
        onClose={() => {}}
      />
    );
    expect(getByText('Usuń').closest('button')!.className).toMatch(/text-danger/);
  });

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn();
    render(
      <PopoverMenu
        open={true}
        anchorRect={fakeRect()}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PopoverMenu
        open={true}
        anchorRect={fakeRect()}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={onClose}
      />
    );
    fireEvent.click(getByTestId('popover-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('positions the menu top = anchor bottom + 4 and right-aligned to anchor', () => {
    const rect = fakeRect({ bottom: 140, right: 244 });
    const { getByTestId } = render(
      <PopoverMenu
        open={true}
        anchorRect={rect}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={() => {}}
      />
    );
    const menu = getByTestId('popover-menu') as HTMLElement;
    expect(menu.style.top).toBe('144px');
    const expectedRight = window.innerWidth - 244;
    expect(menu.style.right).toBe(`${expectedRight}px`);
  });

  it('clamps to at least 8px from the viewport right edge when anchor near edge', () => {
    const rect = fakeRect({ bottom: 140, right: window.innerWidth + 100 });
    const { getByTestId } = render(
      <PopoverMenu
        open={true}
        anchorRect={rect}
        items={[{ label: 'Edytuj', onClick: () => {} }]}
        onClose={() => {}}
      />
    );
    const menu = getByTestId('popover-menu') as HTMLElement;
    expect(menu.style.right).toBe('8px');
  });
});
