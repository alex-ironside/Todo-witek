import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import MoveCategorySheet from './MoveCategorySheet';
import type { Category, Todo } from '../../types';

const cats: Category[] = [
  { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
  { id: 'sluzbowe', ownerId: 'u', name: 'Służbowe' },
];

const todoIn = (cat: string | undefined): Todo => ({
  id: 't1',
  ownerId: 'u',
  title: 'kup mleko',
  done: false,
  reminders: [],
  category: cat,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MoveCategorySheet', () => {
  it('is closed when todo is null', () => {
    const { getByRole } = render(
      <MoveCategorySheet
        todo={null}
        categories={cats}
        onClose={vi.fn()}
        onMove={vi.fn()}
      />
    );
    const dialog = getByRole('dialog', { name: 'Przenieś do kategorii' });
    expect(dialog.className).toContain('translate-y-full');
  });

  it('is open and lists every category when a todo is provided', () => {
    const { getByRole, getByText } = render(
      <MoveCategorySheet
        todo={todoIn('prywatne')}
        categories={cats}
        onClose={vi.fn()}
        onMove={vi.fn()}
      />
    );
    const dialog = getByRole('dialog', { name: 'Przenieś do kategorii' });
    expect(dialog.className).toContain('translate-y-0');
    expect(getByText('Prywatne')).toBeInTheDocument();
    expect(getByText('Służbowe')).toBeInTheDocument();
  });

  it('marks the todo current category with "Tutaj" and aria-current', () => {
    const { container, getByText } = render(
      <MoveCategorySheet
        todo={todoIn('sluzbowe')}
        categories={cats}
        onClose={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(getByText('Tutaj')).toBeInTheDocument();
    const current = container.querySelector(
      'button[aria-current="true"]'
    ) as HTMLButtonElement | null;
    expect(current).not.toBeNull();
    expect(current!.textContent).toContain('Służbowe');
  });

  it('picking a different category calls onMove with the new id and closes', async () => {
    const onMove = vi.fn(async () => {});
    const onClose = vi.fn();
    const { getByText } = render(
      <MoveCategorySheet
        todo={todoIn('prywatne')}
        categories={cats}
        onClose={onClose}
        onMove={onMove}
      />
    );
    fireEvent.click(getByText('Służbowe'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(onMove).toHaveBeenCalledWith('t1', 'sluzbowe');
    expect(onClose).toHaveBeenCalled();
  });

  it('picking the current category just closes without calling onMove', () => {
    const onMove = vi.fn(async () => {});
    const onClose = vi.fn();
    const { getByText } = render(
      <MoveCategorySheet
        todo={todoIn('prywatne')}
        categories={cats}
        onClose={onClose}
        onMove={onMove}
      />
    );
    fireEvent.click(getByText('Prywatne'));
    expect(onMove).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles a todo without a category by treating no row as current', () => {
    const { queryByText } = render(
      <MoveCategorySheet
        todo={todoIn(undefined)}
        categories={cats}
        onClose={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(queryByText('Tutaj')).toBeNull();
  });
});
