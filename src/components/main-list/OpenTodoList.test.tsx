import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type { Todo, TodoRepository } from '../../types';
import OpenTodoList, { computeReorder } from './OpenTodoList';

function makeRepo(overrides: Partial<TodoRepository> = {}): TodoRepository {
  return {
    create: vi.fn().mockResolvedValue('id'),
    update: vi.fn().mockResolvedValue(undefined),
    toggleDone: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn(() => () => {}),
    ...overrides,
  };
}

const todo = (id: string, title: string): Todo => ({
  id,
  ownerId: 'u',
  title,
  done: false,
  reminders: [],
  category: 'prywatne',
});

describe('OpenTodoList', () => {
  let repo: TodoRepository;
  beforeEach(() => { repo = makeRepo(); });

  it('renders one TodoRow per todo', () => {
    const { getByText } = render(
      <RepoProvider repo={repo}>
        <OpenTodoList
          todos={[todo('a', 'one'), todo('b', 'two')]}
          onOpenOverflow={() => {}}
        />
      </RepoProvider>
    );
    expect(getByText('one')).toBeInTheDocument();
    expect(getByText('two')).toBeInTheDocument();
  });

  it('renders nothing when there are no todos', () => {
    const { container } = render(
      <RepoProvider repo={repo}>
        <OpenTodoList todos={[]} onOpenOverflow={() => {}} />
      </RepoProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('computeReorder', () => {
  it('returns the same array when active and over are the same', () => {
    const ids = ['a', 'b', 'c'];
    expect(computeReorder(ids, 'a', 'a')).toBe(ids);
  });

  it('moves active id to over id position', () => {
    expect(computeReorder(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(computeReorder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('returns same reference when over id is missing', () => {
    const ids = ['a', 'b'];
    expect(computeReorder(ids, 'a', 'zzz')).toBe(ids);
  });
});
