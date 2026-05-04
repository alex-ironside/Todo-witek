import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type { Todo, TodoRepository } from '../../types';
import DoneSection from './DoneSection';

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

const mkTodo = (id: string, title: string): Todo => ({
  id,
  ownerId: 'u',
  title,
  done: true,
  reminders: [],
  category: 'prywatne',
});

describe('DoneSection', () => {
  let repo: TodoRepository;
  beforeEach(() => { repo = makeRepo(); });

  it('renders nothing when there are no done todos', () => {
    const { container } = render(
      <RepoProvider repo={repo}>
        <DoneSection todos={[]} onOpenOverflow={() => {}} />
      </RepoProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header "Wykonane (n)" with the count', () => {
    const { getByText } = render(
      <RepoProvider repo={repo}>
        <DoneSection
          todos={[mkTodo('a', 'one'), mkTodo('b', 'two')]}
          onOpenOverflow={() => {}}
        />
      </RepoProvider>
    );
    expect(getByText('Wykonane (2)')).toBeInTheDocument();
  });

  it('starts collapsed (aria-expanded=false, data-open=false)', () => {
    const { getByText, getByTestId } = render(
      <RepoProvider repo={repo}>
        <DoneSection todos={[mkTodo('a', 'one')]} onOpenOverflow={() => {}} />
      </RepoProvider>
    );
    const header = getByText('Wykonane (1)').closest('button');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    const body = getByTestId('done-body');
    expect(body).toHaveAttribute('data-open', 'false');
  });

  it('toggles open on header click', () => {
    const { getByText, getByTestId } = render(
      <RepoProvider repo={repo}>
        <DoneSection todos={[mkTodo('a', 'one')]} onOpenOverflow={() => {}} />
      </RepoProvider>
    );
    const header = getByText('Wykonane (1)').closest('button')!;
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(getByTestId('done-body')).toHaveAttribute('data-open', 'true');
    expect(getByTestId('done-chevron').className).toMatch(/rotate-180/);
  });

  it('renders todo rows in the body (always in DOM)', () => {
    const { getByText } = render(
      <RepoProvider repo={repo}>
        <DoneSection
          todos={[mkTodo('a', 'one'), mkTodo('b', 'two')]}
          onOpenOverflow={() => {}}
        />
      </RepoProvider>
    );
    expect(getByText('one')).toBeInTheDocument();
    expect(getByText('two')).toBeInTheDocument();
  });
});
