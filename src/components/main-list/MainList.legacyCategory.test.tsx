import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import { SELECTED_CATEGORY_KEY } from '../../hooks/useSelectedCategory';
import type {
  Category,
  CategoryRepository,
  Todo,
  CategoryRepository as _CR,
  TodoRepository,
} from '../../types';

// Regression: legacy todos created before the user-managed-category
// feature, or before commit 78b25bd switched Firestore category seeds
// from deterministic ids ('prywatne'/'sluzbowe') to auto-generated ids,
// must remain visible. Two real-world variants are covered:
//
//   1. Todo doc is missing the `category` field entirely (the user's
//      "Prezent rocznicowy" example).
//   2. Todo doc has `category: 'sluzbowe'` (legacy literal id) but no
//      real Category document with id 'sluzbowe' exists any more.
//
// In both cases the `useSelectedCategory` value persisted in
// localStorage is the legacy literal 'prywatne' / 'sluzbowe' — that's
// the state any user who ran the app before 78b25bd has. The fix must
// not depend on the user manually picking a different tab.

let mockTodos: Todo[] = [];
vi.mock('../../hooks/useTodos', () => ({
  useTodos: () => ({ todos: mockTodos, loading: false, error: null }),
}));

let mockCategories: Category[] = [];
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

const wrap = (
  ui: React.ReactNode,
  repo: TodoRepository = makeRepo(),
  categoryRepo: CategoryRepository = makeCategoryRepo()
) => (
  <RepoProvider repo={repo} categoryRepo={categoryRepo}>
    {ui}
  </RepoProvider>
);

describe('MainList — legacy todos without category (regression)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('surfaces a categoryless todo under a virtual "Bez kategorii" tab', async () => {
    // Pre-78b25bd: the user persisted 'prywatne' as the active tab id.
    // Post-78b25bd, no Category document on Firestore has id 'prywatne'.
    localStorage.setItem(SELECTED_CATEGORY_KEY, 'prywatne');

    mockCategories = [
      { id: 'autoPriv123', ownerId: 'u', name: 'Prywatne', position: 1 },
      { id: 'autoSluz456', ownerId: 'u', name: 'Służbowe', position: 2 },
    ];
    mockTodos = [
      {
        id: 'legacy-1',
        ownerId: 'iJRxtwTXEwP3jxIIbc3LNa8CRFs1',
        title: 'Prezent rocznicowy',
        done: false,
        reminders: [],
        // no `category` field — the production-doc shape the user reported
      },
    ];

    const { findByRole, findByText } = render(wrap(<MainList />));
    await act(async () => {});

    // The "Bez kategorii" tab must be visible because there is at
    // least one todo in the uncategorized bucket.
    const uncatTab = await findByRole('tab', { name: 'Bez kategorii' });
    fireEvent.click(uncatTab);
    expect(await findByText('Prezent rocznicowy')).toBeInTheDocument();
  });

  it('maps a legacy "sluzbowe" literal to the user category named "Służbowe" by name', async () => {
    localStorage.setItem(SELECTED_CATEGORY_KEY, 'sluzbowe');

    mockCategories = [
      { id: 'autoPriv123', ownerId: 'u', name: 'Prywatne', position: 1 },
      { id: 'autoSluz456', ownerId: 'u', name: 'Służbowe', position: 2 },
    ];
    mockTodos = [
      {
        id: 'legacy-2',
        ownerId: 'u',
        title: 'Stara sprawa służbowa',
        done: false,
        reminders: [],
        category: 'sluzbowe',
      },
    ];

    const { findByText } = render(wrap(<MainList />));
    await act(async () => {});

    // Because localStorage held the legacy literal 'sluzbowe', the
    // selected-category fallback should resolve it by name to
    // autoSluz456 and the todo should be visible without the user
    // having to switch tabs.
    expect(await findByText('Stara sprawa służbowa')).toBeInTheDocument();
  });

  it('does not show the "Bez kategorii" tab when every todo resolves to a real category', async () => {
    localStorage.setItem(SELECTED_CATEGORY_KEY, 'autoPriv123');
    mockCategories = [
      { id: 'autoPriv123', ownerId: 'u', name: 'Prywatne', position: 1 },
      { id: 'autoSluz456', ownerId: 'u', name: 'Służbowe', position: 2 },
    ];
    mockTodos = [
      {
        id: 'modern-1',
        ownerId: 'u',
        title: 'Nowoczesne zadanie',
        done: false,
        reminders: [],
        category: 'autoPriv123',
      },
    ];

    const { findByText, queryByRole } = render(wrap(<MainList />));
    await act(async () => {});
    expect(await findByText('Nowoczesne zadanie')).toBeInTheDocument();
    expect(queryByRole('tab', { name: 'Bez kategorii' })).toBeNull();
  });
});
