import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import {
  createLocalCategoryRepo,
  LOCAL_CATEGORIES_KEY,
} from '../../repos/localCategoryRepo';
import type {
  Category,
  CategoryRepository,
  Todo,
  TodoCategory,
  TodoRepository,
} from '../../types';

// Persist the selected category in module-scope so MainList's "fall back
// when the persisted category no longer exists" effect can read/write it.
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

// Production wraps the app in <React.StrictMode>, which intentionally
// double-invokes effects in dev. Several category bugs only show up in
// that mode (seed runs twice, listeners get dropped between mounts), so
// these tests wrap their tree the same way.
const wrap = (
  ui: React.ReactNode,
  repo: TodoRepository,
  categoryRepo: CategoryRepository
) => (
  <StrictMode>
    <RepoProvider repo={repo} categoryRepo={categoryRepo}>
      {ui}
    </RepoProvider>
  </StrictMode>
);

beforeEach(() => {
  localStorage.clear();
  mockCategory = 'prywatne';
  mockTodos = [];
  mockSetCategory.mockClear();
});

const tabNames = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).map(
    (t) => t.textContent ?? ''
  );

describe('MainList × real category repo end-to-end', () => {
  it('seeds Prywatne first and Służbowe second on a fresh repo', async () => {
    const categoryRepo = createLocalCategoryRepo();
    const { container } = render(
      wrap(<MainList />, makeRepo(), categoryRepo)
    );
    await waitFor(() => {
      expect(tabNames(container)).toEqual(['Prywatne', 'Służbowe']);
    });
  });

  it('adding a category through the manage sheet appends it as the LAST tab', async () => {
    const categoryRepo = createLocalCategoryRepo();
    const { getByLabelText, getByRole, getByText, getByPlaceholderText, container } =
      render(wrap(<MainList />, makeRepo(), categoryRepo));

    await waitFor(() => {
      expect(tabNames(container)).toEqual(['Prywatne', 'Służbowe']);
    });

    fireEvent.click(getByLabelText('Otwórz menu'));
    fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
    fireEvent.change(getByPlaceholderText('Nazwa kategorii'), {
      target: { value: 'Hobby' },
    });
    await act(async () => {
      fireEvent.click(getByText('Dodaj kategorię'));
      await Promise.resolve();
    });

    await waitFor(() => {
      // What "adding a category works" means to the user: the typed name
      // shows up as a tab AND lands at the end of the tab bar — not
      // pushed to the start where it can be missed.
      expect(tabNames(container)).toEqual([
        'Prywatne',
        'Służbowe',
        'Hobby',
      ]);
    });

    const stored = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    ) as Category[];
    expect(stored.map((c) => c.name).sort()).toEqual([
      'Hobby',
      'Prywatne',
      'Służbowe',
    ]);
  });

  it('renaming a category through the manage sheet updates the tab label', async () => {
    const categoryRepo = createLocalCategoryRepo();
    const updateSpy = vi.spyOn(categoryRepo, 'update');
    const createSpy = vi.spyOn(categoryRepo, 'create');
    const { getByLabelText, getByRole, getAllByText, container, queryByRole } =
      render(wrap(<MainList />, makeRepo(), categoryRepo));

    await waitFor(() => {
      expect(getByRole('tab', { name: 'Prywatne' })).toBeInTheDocument();
    });
    createSpy.mockClear();

    fireEvent.click(getByLabelText('Otwórz menu'));
    fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
    fireEvent.click(getAllByText('Edytuj')[0]);
    const input = container.querySelector(
      'input[aria-label^="Zmień nazwę"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Osobiste' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
      await Promise.resolve();
    });

    // Diagnostic: confirm only update was called (not create) and with the
    // right doc id. If this assertion fails the bug is "rename actually adds
    // a new category" rather than "update doesn't propagate".
    expect(updateSpy).toHaveBeenCalledWith('prywatne', { name: 'Osobiste' });
    expect(createSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(getByRole('tab', { name: 'Osobiste' })).toBeInTheDocument();
      expect(queryByRole('tab', { name: 'Prywatne' })).toBeNull();
    });
  });

  it('deleting a category through the manage sheet removes the tab and reassigns its todos', async () => {
    // Pre-seed with a Służbowe-todo. The todo lives in the parent-mocked
    // useTodos state but the category repo is real; deleting Służbowe must
    // call repo.update reassigning the todo to Prywatne.
    const todoRepo = makeRepo();
    mockTodos = [
      {
        id: 't1',
        ownerId: 'u',
        title: 'biuro',
        done: false,
        reminders: [],
        category: 'sluzbowe',
      },
    ];
    const categoryRepo = createLocalCategoryRepo();
    const { getByLabelText, getByRole, getByText, getAllByText, queryByRole } =
      render(wrap(<MainList />, todoRepo, categoryRepo));

    await waitFor(() => {
      expect(getByRole('tab', { name: 'Służbowe' })).toBeInTheDocument();
    });

    fireEvent.click(getByLabelText('Otwórz menu'));
    fireEvent.click(getByRole('button', { name: 'Zarządzaj kategoriami' }));
    const usun = getAllByText('Usuń');
    // The last "Usuń" in document order belongs to the Służbowe row.
    fireEvent.click(usun[usun.length - 1]);
    await act(async () => {
      fireEvent.click(getByText('Na pewno?'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(queryByRole('tab', { name: 'Służbowe' })).toBeNull();
    });
    expect(todoRepo.update).toHaveBeenCalledWith('t1', {
      category: 'prywatne',
    });
  });
});
