import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type { Todo, TodoRepository } from '../../types';
import TodoRow from './TodoRow';

function makeRepo(overrides: Partial<TodoRepository> = {}): TodoRepository {
  return {
    create: vi.fn().mockResolvedValue('id-x'),
    update: vi.fn().mockResolvedValue(undefined),
    toggleDone: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn(() => () => {}),
    ...overrides,
  };
}

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't1',
  ownerId: 'u1',
  title: 'kup mleko',
  done: false,
  reminders: [],
  category: 'prywatne',
  ...over,
});

const wrap = (repo: TodoRepository, ui: React.ReactNode) => (
  <RepoProvider repo={repo}>{ui}</RepoProvider>
);

describe('TodoRow', () => {
  let repo: TodoRepository;
  beforeEach(() => { repo = makeRepo(); });

  it('renders the todo title', () => {
    const { getByText } = render(wrap(repo, <TodoRow todo={todo()} onOpenOverflow={() => {}} />));
    expect(getByText('kup mleko')).toBeInTheDocument();
  });

  it('renders a checkbox button with the title in its accessible name', () => {
    const { getByRole } = render(wrap(repo, <TodoRow todo={todo()} onOpenOverflow={() => {}} />));
    const cb = getByRole('checkbox', { name: /kup mleko/i });
    expect(cb).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking checkbox calls repo.toggleDone with the inverse done value', async () => {
    const { getByRole } = render(wrap(repo, <TodoRow todo={todo()} onOpenOverflow={() => {}} />));
    await act(async () => {
      fireEvent.click(getByRole('checkbox', { name: /kup mleko/i }));
    });
    expect(repo.toggleDone).toHaveBeenCalledWith('t1', true);
  });

  it('done todo marks aria-checked true and applies strike-through classes', () => {
    const { getByRole, getByText } = render(
      wrap(repo, <TodoRow todo={todo({ done: true })} onOpenOverflow={() => {}} />)
    );
    expect(getByRole('checkbox', { name: /kup mleko/i })).toHaveAttribute('aria-checked', 'true');
    const title = getByText('kup mleko');
    expect(title.className).toMatch(/line-through/);
    expect(title.className).toMatch(/text-textDim/);
  });

  it('overflow button calls onOpenOverflow with todo id and a DOMRect', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(wrap(repo, <TodoRow todo={todo()} onOpenOverflow={spy} />));
    fireEvent.click(getByLabelText('Więcej akcji'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('t1');
    const rect = spy.mock.calls[0][1] as DOMRect;
    expect(typeof rect.bottom).toBe('number');
    expect(typeof rect.right).toBe('number');
  });

  it('does not render reminder bell when there are no reminders', () => {
    const { queryByTestId } = render(wrap(repo, <TodoRow todo={todo()} onOpenOverflow={() => {}} />));
    expect(queryByTestId('reminder-bell')).toBeNull();
  });

  it('renders reminder bell when reminders exist', () => {
    const t = todo({
      reminders: [{ id: 'r1', remindAt: Date.now() + 3600_000, fired: false }],
    });
    const { getByTestId } = render(wrap(repo, <TodoRow todo={t} onOpenOverflow={() => {}} />));
    expect(getByTestId('reminder-bell')).toBeInTheDocument();
  });

  describe('edit mode', () => {
    it('renders InlineEdit (textbox) instead of the title when isEditing', () => {
      const { getByRole, queryByText } = render(
        wrap(
          repo,
          <TodoRow
            todo={todo()}
            isEditing
            onSaveEdit={() => {}}
            onCancelEdit={() => {}}
            onOpenOverflow={() => {}}
          />
        )
      );
      const input = getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('kup mleko');
      // The title is no longer rendered as static text — it's only in the input value.
      expect(queryByText('kup mleko')).toBeNull();
    });

    it('hides the overflow trigger when editing', () => {
      const { queryByLabelText } = render(
        wrap(
          repo,
          <TodoRow
            todo={todo()}
            isEditing
            onSaveEdit={() => {}}
            onCancelEdit={() => {}}
            onOpenOverflow={() => {}}
          />
        )
      );
      expect(queryByLabelText('Więcej akcji')).toBeNull();
    });

    it('Enter in edit mode calls onSaveEdit with (id, newTitle)', () => {
      const onSaveEdit = vi.fn();
      const { getByRole } = render(
        wrap(
          repo,
          <TodoRow
            todo={todo()}
            isEditing
            onSaveEdit={onSaveEdit}
            onCancelEdit={() => {}}
            onOpenOverflow={() => {}}
          />
        )
      );
      const input = getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'nowy' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSaveEdit).toHaveBeenCalledWith('t1', 'nowy');
    });

    it('Esc in edit mode calls onCancelEdit with the id', () => {
      const onCancelEdit = vi.fn();
      const { getByRole } = render(
        wrap(
          repo,
          <TodoRow
            todo={todo()}
            isEditing
            onSaveEdit={() => {}}
            onCancelEdit={onCancelEdit}
            onOpenOverflow={() => {}}
          />
        )
      );
      fireEvent.keyDown(getByRole('textbox'), { key: 'Escape' });
      expect(onCancelEdit).toHaveBeenCalledWith('t1');
    });
  });
});
