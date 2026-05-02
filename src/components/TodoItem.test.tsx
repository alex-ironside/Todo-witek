import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoItem from './TodoItem';
import { RepoProvider } from '../hooks/RepoContext';
import type { TodoRepository, Todo } from '../types';
import { t } from '../i18n';

const makeRepo = (): TodoRepository => ({
  create: vi.fn(),
  update: vi.fn(),
  toggleDone: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
  observe: vi.fn(() => () => {}),
});

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 't1',
  ownerId: 'u',
  title: 'Buy milk',
  done: false,
  reminders: [],
  ...overrides,
});

describe('TodoItem edit/cancel', () => {
  it('Cancel discards the draft and exits edit mode without writing', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <TodoItem todo={makeTodo({ title: 'Original' })} />
      </RepoProvider>
    );
    await user.click(screen.getByRole('button', { name: t.edit }));
    const input = screen.getByDisplayValue('Original');
    await user.clear(input);
    await user.type(input, 'New text');
    await user.click(screen.getByRole('button', { name: t.cancel }));
    expect(repo.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('New text')).not.toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('Enter saves the trimmed draft', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <TodoItem todo={makeTodo({ title: 'Original' })} />
      </RepoProvider>
    );
    await user.click(screen.getByRole('button', { name: t.edit }));
    const input = screen.getByDisplayValue('Original');
    await user.clear(input);
    await user.type(input, '  New title  {Enter}');
    expect(repo.update).toHaveBeenCalledWith('t1', { title: 'New title' });
  });

  it('Save button writes the trimmed draft and exits edit mode', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <TodoItem todo={makeTodo({ title: 'Original' })} />
      </RepoProvider>
    );
    await user.click(screen.getByRole('button', { name: t.edit }));
    const input = screen.getByDisplayValue('Original');
    await user.clear(input);
    await user.type(input, '  New title  ');
    await user.click(screen.getByRole('button', { name: t.save }));
    expect(repo.update).toHaveBeenCalledWith('t1', { title: 'New title' });
    expect(screen.queryByDisplayValue('  New title  ')).not.toBeInTheDocument();
  });
});

describe('TodoItem delete confirmation', () => {
  it('does NOT delete on the first click — asks for confirmation instead', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <TodoItem todo={makeTodo()} />
      </RepoProvider>
    );

    await user.click(screen.getByRole('button', { name: t.delete }));
    expect(repo.delete).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: t.deleteConfirm })
    ).toBeInTheDocument();
  });

  it('deletes on the second click', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <TodoItem todo={makeTodo()} />
      </RepoProvider>
    );
    await user.click(screen.getByRole('button', { name: t.delete }));
    await user.click(screen.getByRole('button', { name: t.deleteConfirm }));
    expect(repo.delete).toHaveBeenCalledWith('t1');
  });

  it('reverts the confirmation state after a timeout', () => {
    vi.useFakeTimers();
    try {
      const repo = makeRepo();
      render(
        <RepoProvider repo={repo}>
          <TodoItem todo={makeTodo()} />
        </RepoProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: t.delete }));
      expect(
        screen.getByRole('button', { name: t.deleteConfirm })
      ).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(
        screen.getByRole('button', { name: t.delete })
      ).toBeInTheDocument();
      expect(repo.delete).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
