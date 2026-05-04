import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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

  it('hamburger fires onOpenDrawer', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(<MainList onOpenDrawer={spy} />));
    fireEvent.click(getByLabelText('Otwórz menu'));
    expect(spy).toHaveBeenCalled();
  });

  it('cog fires onOpenSettings', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(<MainList onOpenSettings={spy} />));
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    expect(spy).toHaveBeenCalled();
  });

  it('overflow button fires onOpenOverflow with todo id', () => {
    mockTodos = [todo({ id: 'tx', title: 'open me' })];
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(<MainList onOpenOverflow={spy} />));
    fireEvent.click(getByLabelText(/Więcej akcji/));
    expect(spy).toHaveBeenCalledWith('tx');
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
});
