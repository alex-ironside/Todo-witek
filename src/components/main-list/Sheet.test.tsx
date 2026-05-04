import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sheet from './Sheet';

describe('Sheet', () => {
  it('renders children inside a role=dialog element', () => {
    render(
      <Sheet open onClose={() => {}} title="Tytuł">
        <p>hello</p>
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toContain('hello');
  });

  it('uses translate-y-full and inert when closed', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="Tytuł">
        <p>hello</p>
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('translate-y-full');
    expect(dialog.hasAttribute('inert')).toBe(true);
  });

  it('uses translate-y-0 and removes inert when open', () => {
    render(
      <Sheet open onClose={() => {}} title="Tytuł">
        <p>hello</p>
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('translate-y-0');
    expect(dialog.hasAttribute('inert')).toBe(false);
  });

  it('calls onClose on Escape only when open', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open={false} onClose={onClose} title="T">
        <p />
      </Sheet>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    rerender(
      <Sheet open onClose={onClose} title="T">
        <p />
      </Sheet>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="T">
        <p />
      </Sheet>
    );
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses aria-label from title and renders title text', () => {
    render(
      <Sheet open onClose={() => {}} title="Przypomnienia">
        <p />
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Przypomnienia');
    expect(screen.getByText('Przypomnienia')).toBeInTheDocument();
  });

  it('renders the drag handle pill', () => {
    render(
      <Sheet open onClose={() => {}} title="T">
        <p />
      </Sheet>
    );
    expect(screen.getByTestId('sheet-handle')).toBeInTheDocument();
  });

  it('applies motion-reduce:duration-0 to the panel', () => {
    render(
      <Sheet open onClose={() => {}} title="T">
        <p />
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('motion-reduce:duration-0');
  });
});
