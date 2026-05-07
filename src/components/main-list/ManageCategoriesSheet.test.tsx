import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import ManageCategoriesSheet from './ManageCategoriesSheet';
import type { Category } from '../../types';

const cats: Category[] = [
  { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
  { id: 'sluzbowe', ownerId: 'u', name: 'Służbowe' },
];

const baseProps = {
  open: true,
  onClose: vi.fn(),
  categories: cats,
  onCreate: vi.fn(async () => {}),
  onRename: vi.fn(async () => {}),
  onDelete: vi.fn(async () => {}),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ManageCategoriesSheet', () => {
  it('shows the sheet title and lists every category', () => {
    const { getByText } = render(<ManageCategoriesSheet {...baseProps} />);
    expect(getByText('Zarządzaj kategoriami')).toBeInTheDocument();
    expect(getByText('Prywatne')).toBeInTheDocument();
    expect(getByText('Służbowe')).toBeInTheDocument();
  });

  it('typing a name and submitting calls onCreate with the trimmed value', async () => {
    const onCreate = vi.fn(async () => {});
    const { getByPlaceholderText, getByText } = render(
      <ManageCategoriesSheet {...baseProps} onCreate={onCreate} />
    );
    const input = getByPlaceholderText('Nazwa kategorii') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Hobby  ' } });
    fireEvent.click(getByText('Dodaj kategorię'));
    expect(onCreate).toHaveBeenCalledWith('Hobby');
  });

  it('refuses to create a category with a duplicate name', () => {
    const onCreate = vi.fn(async () => {});
    const { getByPlaceholderText, getByText, getByRole } = render(
      <ManageCategoriesSheet {...baseProps} onCreate={onCreate} />
    );
    fireEvent.change(getByPlaceholderText('Nazwa kategorii'), {
      target: { value: 'prywatne' },
    });
    fireEvent.click(getByText('Dodaj kategorię'));
    expect(onCreate).not.toHaveBeenCalled();
    expect(getByRole('alert').textContent).toMatch(/już istnieje/);
  });

  it('clicking Edytuj on a row puts it into rename mode', () => {
    const { getAllByText, container } = render(
      <ManageCategoriesSheet {...baseProps} />
    );
    fireEvent.click(getAllByText('Edytuj')[0]);
    const input = container.querySelector(
      'input[aria-label^="Zmień nazwę"]'
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Prywatne');
  });

  it('renaming via Enter calls onRename and exits edit mode', () => {
    const onRename = vi.fn(async () => {});
    const { getAllByText, container } = render(
      <ManageCategoriesSheet {...baseProps} onRename={onRename} />
    );
    fireEvent.click(getAllByText('Edytuj')[0]);
    const input = container.querySelector(
      'input[aria-label^="Zmień nazwę"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Osobiste' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('prywatne', 'Osobiste');
    expect(
      container.querySelector('input[aria-label^="Zmień nazwę"]')
    ).toBeNull();
  });

  it('Escape during rename exits edit mode without saving', () => {
    const onRename = vi.fn(async () => {});
    const { getAllByText, container } = render(
      <ManageCategoriesSheet {...baseProps} onRename={onRename} />
    );
    fireEvent.click(getAllByText('Edytuj')[0]);
    const input = container.querySelector(
      'input[aria-label^="Zmień nazwę"]'
    ) as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(
      container.querySelector('input[aria-label^="Zmień nazwę"]')
    ).toBeNull();
  });

  it('first delete click flips label to confirm and does not delete yet', () => {
    const onDelete = vi.fn(async () => {});
    const { getAllByText, getByText } = render(
      <ManageCategoriesSheet {...baseProps} onDelete={onDelete} />
    );
    fireEvent.click(getAllByText('Usuń')[0]);
    expect(onDelete).not.toHaveBeenCalled();
    expect(getByText('Na pewno?')).toBeInTheDocument();
  });

  it('second delete click invokes onDelete with the category id', () => {
    const onDelete = vi.fn(async () => {});
    const { getAllByText, getByText } = render(
      <ManageCategoriesSheet {...baseProps} onDelete={onDelete} />
    );
    fireEvent.click(getAllByText('Usuń')[0]);
    fireEvent.click(getByText('Na pewno?'));
    expect(onDelete).toHaveBeenCalledWith('prywatne');
  });

  it('after 2s the confirm flag reverts to Usuń', () => {
    vi.useFakeTimers();
    try {
      const { getAllByText, queryByText } = render(
        <ManageCategoriesSheet {...baseProps} />
      );
      fireEvent.click(getAllByText('Usuń')[0]);
      expect(queryByText('Na pewno?')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(queryByText('Na pewno?')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('disables delete when only one category remains', () => {
    const single: Category[] = [
      { id: 'only', ownerId: 'u', name: 'Tylko ta' },
    ];
    const onDelete = vi.fn(async () => {});
    const { getByLabelText } = render(
      <ManageCategoriesSheet
        {...baseProps}
        categories={single}
        onDelete={onDelete}
      />
    );
    const btn = getByLabelText('Usuń kategorię „Tylko ta"');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no categories', () => {
    const { getByText } = render(
      <ManageCategoriesSheet {...baseProps} categories={[]} />
    );
    expect(getByText('Brak kategorii.')).toBeInTheDocument();
  });
});
