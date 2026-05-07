import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type {
  Category,
  CategoryRepository,
  Todo,
  TodoCategory,
  TodoRepository,
} from '../../types';

// Selected category mock — shared spy state
let mockCategory: TodoCategory = 'prywatne';
const mockSetCategory = vi.fn((next: TodoCategory) => {
  mockCategory = next;
});
vi.mock('../../hooks/useSelectedCategory', () => ({
  useSelectedCategory: () => [mockCategory, mockSetCategory] as const,
}));

let mockTodos: Todo[] = [];
vi.mock('../../hooks/useTodos', () => ({
  useTodos: () => ({ todos: mockTodos, loading: false, error: null }),
}));

let mockCategories: Category[] = [
  { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
  { id: 'sluzbowe', ownerId: 'u', name: 'Służbowe' },
];
vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useAccent', () => ({
  useAccent: () => ['amber', vi.fn()] as const,
}));

vi.mock('../../hooks/useStorageMode', () => ({
  useStorageMode: () => ['local', vi.fn()] as const,
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

function makeCategoryRepo(): CategoryRepository {
  return {
    create: vi.fn().mockResolvedValue('cat-id'),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
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

const wrap = (
  ui: React.ReactNode,
  repo: TodoRepository = makeRepo(),
  categoryRepo: CategoryRepository = makeCategoryRepo()
) => (
  <RepoProvider repo={repo} categoryRepo={categoryRepo}>
    {ui}
  </RepoProvider>
);

describe('MainList', () => {
  beforeEach(() => {
    mockCategory = 'prywatne';
    mockTodos = [];
    mockCategories = [
      { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
      { id: 'sluzbowe', ownerId: 'u', name: 'Służbowe' },
    ];
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

  it('left-edge swipe opens the drawer', () => {
    const { container } = render(wrap(<MainList />));
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
    const dispatch = (type: string, clientX: number, timeStamp: number) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'clientX', { value: clientX });
      Object.defineProperty(ev, 'pointerId', { value: 1 });
      Object.defineProperty(ev, 'timeStamp', { value: timeStamp });
      document.dispatchEvent(ev);
    };
    act(() => {
      dispatch('pointerdown', 5, 0);
      dispatch('pointermove', 90, 100);
      dispatch('pointerup', 90, 200);
    });
    expect(aside?.getAttribute('aria-hidden')).toBe('false');
  });

  it('cog fires onOpenSettings', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(<MainList onOpenSettings={spy} />));
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    expect(spy).toHaveBeenCalled();
  });

  it('cog opens the SettingsSheet (titled Ustawienia)', () => {
    const { getByLabelText, getAllByRole } = render(wrap(<MainList />));
    const sheetBefore = getAllByRole('dialog').find(
      (d) => d.getAttribute('aria-label') === 'Ustawienia'
    );
    expect(sheetBefore?.className).toContain('translate-y-full');
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    const sheetAfter = getAllByRole('dialog').find(
      (d) => d.getAttribute('aria-label') === 'Ustawienia'
    );
    expect(sheetAfter?.className).toContain('translate-y-0');
  });

  it('SettingsSheet hides AccountGroup and PushGroup when no email/push props', () => {
    const { getByLabelText, queryByText } = render(wrap(<MainList />));
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    expect(queryByText('Zalogowany jako')).toBeNull();
    expect(queryByText('Powiadomienia push')).toBeNull();
    expect(queryByText('Wygląd')).not.toBeNull();
    expect(queryByText('Przechowywanie')).not.toBeNull();
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

  it('shows todos whose category id no longer exists under the first category', () => {
    // Simulates legacy todos whose `category` string does not match any
    // current category — they should not vanish; they appear under the
    // first available category.
    mockCategories = [
      { id: 'auto-1', ownerId: 'u', name: 'Prywatne' },
      { id: 'auto-2', ownerId: 'u', name: 'Służbowe' },
    ];
    mockCategory = 'auto-1';
    mockTodos = [todo({ id: 'l', title: 'legacy', category: 'prywatne' })];
    const { getByText } = render(wrap(<MainList />));
    expect(getByText('legacy')).toBeInTheDocument();
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

  describe('manage categories', () => {
    it('drawer exposes a Zarządzaj kategoriami entry that opens the manage sheet', () => {
      const { getByLabelText, getByRole, getAllByRole } = render(
        wrap(<MainList />)
      );
      fireEvent.click(getByLabelText('Otwórz menu'));
      fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
      const dialog = getAllByRole('dialog').find(
        (d) => d.getAttribute('aria-label') === 'Zarządzaj kategoriami'
      );
      expect(dialog).toBeDefined();
      expect(dialog?.className).toContain('translate-y-0');
    });

    it('creating a category in the sheet calls categoryRepo.create', () => {
      const categoryRepo = makeCategoryRepo();
      const { getByLabelText, getByRole, getByText, getByPlaceholderText } =
        render(wrap(<MainList />, makeRepo(), categoryRepo));
      fireEvent.click(getByLabelText('Otwórz menu'));
      fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
      fireEvent.change(getByPlaceholderText('Nazwa kategorii'), {
        target: { value: 'Hobby' },
      });
      fireEvent.click(getByText('Dodaj kategorię'));
      expect(categoryRepo.create).toHaveBeenCalledWith({ name: 'Hobby' });
    });

    it('renaming a category in the sheet calls categoryRepo.update', () => {
      const categoryRepo = makeCategoryRepo();
      const { getByLabelText, getByRole, getAllByText, container } = render(
        wrap(<MainList />, makeRepo(), categoryRepo)
      );
      fireEvent.click(getByLabelText('Otwórz menu'));
      fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
      fireEvent.click(getAllByText('Edytuj')[0]);
      const input = container.querySelector(
        'input[aria-label^="Zmień nazwę"]'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Osobiste' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(categoryRepo.update).toHaveBeenCalledWith('prywatne', {
        name: 'Osobiste',
      });
    });

    it('deleting a category reassigns matching todos to the fallback then deletes it', async () => {
      mockTodos = [
        todo({ id: 'a', title: 'one', category: 'sluzbowe' }),
        todo({ id: 'b', title: 'two', category: 'sluzbowe' }),
      ];
      const repo = makeRepo();
      const categoryRepo = makeCategoryRepo();
      const { getByLabelText, getByRole, getByText, getAllByText } = render(
        wrap(<MainList />, repo, categoryRepo)
      );
      fireEvent.click(getByLabelText('Otwórz menu'));
      fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
      const usun = getAllByText('Usuń');
      fireEvent.click(usun[usun.length - 1]); // Służbowe row
      fireEvent.click(getByText('Na pewno?'));
      // wait microtask for the async handler
      await act(async () => {
        await Promise.resolve();
      });
      expect(repo.update).toHaveBeenCalledWith('a', { category: 'prywatne' });
      expect(repo.update).toHaveBeenCalledWith('b', { category: 'prywatne' });
      expect(categoryRepo.delete).toHaveBeenCalledWith('sluzbowe');
    });
  });

  describe('overflow menu, edit, and delete', () => {
    beforeEach(() => {
      mockTodos = [todo({ id: 'tx', title: 'open me' })];
    });

    it('clicking ••• opens a menu containing Edytuj, Przenieś, Przypomnij, Usuń', () => {
      const { getByLabelText, getByText } = render(wrap(<MainList />));
      fireEvent.click(getByLabelText('Więcej akcji'));
      expect(getByText('Edytuj')).toBeInTheDocument();
      expect(getByText('Przenieś')).toBeInTheDocument();
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

    it('clicking Przypomnij opens the RemindersSheet for that todo', () => {
      const { getByLabelText, getByText, getAllByRole } = render(
        wrap(<MainList />)
      );
      const dialogBefore = getAllByRole('dialog')[0];
      expect(dialogBefore.className).toContain('translate-y-full');
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Przypomnij'));
      const dialog = getAllByRole('dialog')[0];
      expect(dialog.className).toContain('translate-y-0');
      expect(dialog.textContent).toContain('open me');
    });

    it('Anuluj inside the RemindersSheet closes it', () => {
      const { getByLabelText, getByText, getAllByRole } = render(
        wrap(<MainList />)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.click(getByText('Przypomnij'));
      const cancelBtns = getAllByRole('button').filter(
        (b) => b.textContent === 'Anuluj'
      );
      fireEvent.click(cancelBtns[0]);
      const dialog = getAllByRole('dialog')[0];
      expect(dialog.className).toContain('translate-y-full');
    });

    describe('move between categories', () => {
      it('clicking Przenieś opens the move sheet listing every category', () => {
        const { getByLabelText, getByText, getAllByRole } = render(
          wrap(<MainList />)
        );
        fireEvent.click(getByLabelText('Więcej akcji'));
        fireEvent.click(getByText('Przenieś'));
        const dialog = getAllByRole('dialog').find(
          (d) => d.getAttribute('aria-label') === 'Przenieś do kategorii'
        );
        expect(dialog).toBeDefined();
        expect(dialog?.className).toContain('translate-y-0');
        // both seeded categories are options
        expect(dialog?.textContent).toContain('Prywatne');
        expect(dialog?.textContent).toContain('Służbowe');
      });

      it('selecting a category in the move sheet calls repo.update with that category', async () => {
        const repo = makeRepo();
        const { getByLabelText, getByText, getAllByRole } = render(
          wrap(<MainList />, repo)
        );
        fireEvent.click(getByLabelText('Więcej akcji'));
        fireEvent.click(getByText('Przenieś'));
        const dialog = getAllByRole('dialog').find(
          (d) => d.getAttribute('aria-label') === 'Przenieś do kategorii'
        )!;
        const target = Array.from(
          dialog.querySelectorAll('button')
        ).find((b) => b.textContent?.includes('Służbowe'))!;
        fireEvent.click(target);
        await act(async () => {
          await Promise.resolve();
        });
        expect(repo.update).toHaveBeenCalledWith('tx', {
          category: 'sluzbowe',
        });
        const after = getAllByRole('dialog').find(
          (d) => d.getAttribute('aria-label') === 'Przenieś do kategorii'
        );
        expect(after?.className).toContain('translate-y-full');
      });
    });

    it('Esc with menu open closes the menu (no edit mode)', () => {
      const { getByLabelText, queryByText, getAllByRole } = render(
        wrap(<MainList />)
      );
      fireEvent.click(getByLabelText('Więcej akcji'));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(queryByText('Edytuj')).toBeNull();
      const inputs = getAllByRole('textbox') as HTMLInputElement[];
      const editInputs = inputs.filter((i) => i.value === 'open me');
      expect(editInputs).toHaveLength(0);
    });
  });
});
