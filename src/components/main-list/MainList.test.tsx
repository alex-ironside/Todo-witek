import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type { Todo, TodoRepository } from '../../types';

// Selected category mock — shared spy state
let mockCategory: 'prywatne' | 'sluzbowe' = 'prywatne';
const mockSetCategory = vi.fn((next: 'prywatne' | 'sluzbowe') => {
  mockCategory = next;
});
vi.mock('../../hooks/useSelectedCategory', () => ({
  useSelectedCategory: () => [mockCategory, mockSetCategory] as const,
}));

let mockTodos: Todo[] = [];
vi.mock('../../hooks/useTodos', () => ({
  useTodos: () => ({ todos: mockTodos, loading: false, error: null }),
}));

import MainList from './MainList';

function makeRepo(): TodoRepository {
  return {
    create: vi.fn().mockResolvedValue('id'),
    update: vi.fn().mockResolvedValue(undefined),
    toggleDone: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn(() => () => {}),
  };
}

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't1',
  ownerId: 'u',
  title: 'one',
  done: false,
  reminders: [],
  category: 'prywatne',
  ...over,
});

const wrap = (ui: React.ReactNode, repo: TodoRepository = makeRepo()) => (
  <RepoProvider repo={repo}>{ui}</RepoProvider>
);

describe('MainList', () => {
  beforeEach(() => {
    mockCategory = 'prywatne';
    mockTodos = [];
    mockSetCategory.mockClear();
  });

  it('renders EmptyState when there are no open todos in active category', () => {
    const { getByText } = render(wrap(<MainList />));
    expect(getByText('Brak zadań.')).toBeInTheDocument();
  });

  it('renders TodoRow when there is at least one open todo', () => {
    mockTodos = [todo({ title: 'kup mleko' })];
    const { getByText, queryByText } = render(wrap(<MainList />));
    expect(getByText('kup mleko')).toBeInTheDocument();
    expect(queryByText('Brak zadań.')).toBeNull();
  });

  it('shows EmptyState AND Wykonane(n) when only done todos exist', () => {
    mockTodos = [todo({ id: 'd1', title: 'gotowe', done: true })];
    const { getByText } = render(wrap(<MainList />));
    expect(getByText('Brak zadań.')).toBeInTheDocument();
    expect(getByText('Wykonane (1)')).toBeInTheDocument();
  });

  it('hamburger opens the drawer (state owned by MainList)', () => {
    const { getByLabelText, container } = render(wrap(<MainList />));
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(getByLabelText('Otwórz menu'));
    expect(aside?.getAttribute('aria-hidden')).toBe('false');
  });

  it('cog fires onOpenSettings', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(<MainList onOpenSettings={spy} />));
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    expect(spy).toHaveBeenCalled();
  });

  it('switching tab calls setCategory', () => {
    const { getByRole } = render(wrap(<MainList />));
    fireEvent.click(getByRole('tab', { name: 'Służbowe' }));
    expect(mockSetCategory).toHaveBeenCalledWith('sluzbowe');
  });

  it('filters todos by active category', () => {
    mockTodos = [
      todo({ id: 'p', title: 'priv', category: 'prywatne' }),
      todo({ id: 's', title: 'serv', category: 'sluzbowe' }),
    ];
    const { getByText, queryByText } = render(wrap(<MainList />));
    expect(getByText('priv')).toBeInTheDocument();
    expect(queryByText('serv')).toBeNull();
  });

  it('clicking a drawer category row sets the category and closes the drawer', () => {
    mockTodos = [todo({ id: 's1', title: 'serv', category: 'sluzbowe' })];
    const { getByLabelText, container, getAllByText } = render(
      wrap(<MainList />)
    );
    fireEvent.click(getByLabelText('Otwórz menu'));
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('false');
    const matches = getAllByText('Służbowe');
    fireEvent.click(matches[matches.length - 1]);
    expect(mockSetCategory).toHaveBeenCalledWith('sluzbowe');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
  });

  it('drawer rows show open-todo counts per category', () => {
    mockTodos = [
      todo({ id: 'p1', title: 'a', category: 'prywatne' }),
      todo({ id: 'p2', title: 'b', category: 'prywatne' }),
      todo({ id: 'p3', title: 'c', category: 'prywatne', done: true }),
      todo({ id: 's1', title: 'd', category: 'sluzbowe' }),
    ];
    const { getByLabelText, container } = render(wrap(<MainList />));
    fireEvent.click(getByLabelText('Otwórz menu'));
    const aside = container.querySelector('aside');
    expect(aside?.textContent).toContain('Prywatne');
    expect(aside?.textContent).toMatch(/Prywatne[\s\S]*2/);
    expect(aside?.textContent).toMatch(/Służbowe[\s\S]*1/);
  });

  describe('overflow menu, edit, and delete', () => {
    beforeEach(() => {
      mockTodos = [todo({ id: 'tx', title: 'open me' })];
    });

    it('clicking ••• opens a menu containing Edytuj, Przypomnij, Usuń', () => {
      const { getByLabelText, getByText } = render(wrap(<MainList />));
      fireEvent.click(getByLabelText('Więcej akcji'));
      expect(getByText('Edytuj')).toBeInTheDocument();
      expect(getByText('Przypomnij')).toBeInTheDocument();
      expect(getByText('Usuń')).toBeInTheDocument();
    });

    const findEditInput = (
      getAllByRole: (role: string) => HTMLElement[]
    ): HTMLInputElement | null => {
      const inputs = getAllByRole('textbox') as HTMLInputElement[];
      return inputs.find((i) => i.value === 'open me' || i.value === 'nowy tytuł') ?? null;
    };

    it('clicking Edytuj closes the menu and renders the row in edit mode', () => {
      const { getByLabelText, getByText, getAllByRole, queryByText } = render(
        wrap(<MainList />)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Edytuj'));
      expect(queryByText('Przypomnij')).toBeNull();
      const input = findEditInput(getAllByRole);
      expect(input).not.toBeNull();
      expect(input!.value).toBe('open me');
    });

    it('Enter in edit mode calls repo.update and exits edit mode', () => {
      const repo = makeRepo();
      const { getByLabelText, getByText, getAllByRole } = render(
        wrap(<MainList />, repo)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Edytuj'));
      const input = findEditInput(getAllByRole)!;
      fireEvent.change(input, { target: { value: 'nowy tytuł' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(repo.update).toHaveBeenCalledWith('tx', { title: 'nowy tytuł' });
      // edit input no longer present
      expect(findEditInput(getAllByRole)).toBeNull();
    });

    it('Esc in edit mode exits edit mode without calling repo.update', () => {
      const repo = makeRepo();
      const { getByLabelText, getByText, getAllByRole } = render(
        wrap(<MainList />, repo)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Edytuj'));
      const input = findEditInput(getAllByRole)!;
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(repo.update).not.toHaveBeenCalled();
      expect(findEditInput(getAllByRole)).toBeNull();
    });

    it('clicking Usuń once flips label to Na pewno? and does not delete', () => {
      const repo = makeRepo();
      const { getByLabelText, getByText, queryByText } = render(
        wrap(<MainList />, repo)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Usuń'));
      expect(repo.delete).not.toHaveBeenCalled();
      expect(getByText('Na pewno?')).toBeInTheDocument();
      // menu still open
      expect(queryByText('Edytuj')).toBeInTheDocument();
    });

    it('clicking Na pewno? deletes the todo and closes the menu', () => {
      const repo = makeRepo();
      const { getByLabelText, getByText, queryByText } = render(
        wrap(<MainList />, repo)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Usuń'));
      fireEvent.click(getByText('Na pewno?'));
      expect(repo.delete).toHaveBeenCalledWith('tx');
      expect(queryByText('Edytuj')).toBeNull();
    });

    it('after 2s the Na pewno? label reverts to Usuń', () => {
      vi.useFakeTimers();
      try {
        const repo = makeRepo();
        const { getByLabelText, getByText, queryByText } = render(
          wrap(<MainList />, repo)
        );
        fireEvent.click(getByLabelText('Więcej akcji'));
        fireEvent.click(getByText('Usuń'));
        expect(getByText('Na pewno?')).toBeInTheDocument();
        act(() => {
          vi.advanceTimersByTime(2000);
        });
        expect(queryByText('Na pewno?')).toBeNull();
        expect(getByText('Usuń')).toBeInTheDocument();
        expect(repo.delete).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('clicking Przypomnij calls onOpenReminders with the todo id', () => {
      const onOpenReminders = vi.fn();
      const { getByLabelText, getByText } = render(
        wrap(<MainList onOpenReminders={onOpenReminders} />)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Przypomnij'));
      expect(onOpenReminders).toHaveBeenCalledWith('tx');
    });

    it('Esc with menu open closes the menu (no edit mode)', () => {
      const { getByLabelText, queryByText, getAllByRole } = render(
        wrap(<MainList />)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(queryByText('Edytuj')).toBeNull();
      // Only AddTodoRow's input remains (with empty value); no edit textbox.
      const inputs = getAllByRole('textbox') as HTMLInputElement[];
      const editInputs = inputs.filter((i) => i.value === 'open me');
      expect(editInputs).toHaveLength(0);
    });
  });
});
