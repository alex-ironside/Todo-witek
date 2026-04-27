import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoForm from './TodoForm';
import { RepoProvider } from '../hooks/RepoContext';
import type { TodoRepository } from '../types';
import { createLocalTodoRepo, LOCAL_TODOS_KEY } from '../repos/localTodoRepo';
import { t } from '../i18n';

// --- helpers ---

const makeRepo = (overrides: Partial<TodoRepository> = {}): TodoRepository => ({
  create: vi.fn().mockResolvedValue('new-id'),
  update: vi.fn(),
  toggleDone: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
  observe: vi.fn(() => () => {}),
  ...overrides,
});

function renderForm(repo: TodoRepository) {
  return render(
    <RepoProvider repo={repo}>
      <TodoForm />
    </RepoProvider>
  );
}

// --- tests against mocked repo ---

describe('TodoForm — submit with mocked repo', () => {
  it('clears and re-enables the input after first successful add', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('');
  });

  it('returns focus to the input after successful add so typing works immediately', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    // The input must hold focus so the user can type a second task without
    // clicking again. This is the regression: disabling the input during
    // submit blurs it; focus must be restored after busy clears.
    expect(input).toHaveFocus();
  });

  it('accepts a second add after the first', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    await user.type(input, 'Second task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenNthCalledWith(2, {
      title: 'Second task',
      reminders: [],
    });
  });

  it('renders the keep-input toggle above the text field', () => {
    const repo = makeRepo();
    renderForm(repo);
    expect(screen.getByRole('checkbox', { name: t.keepInputToggle })).toBeInTheDocument();
  });

  it('clears the input by default (toggle off) after successful add', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);
    await user.type(input, 'My task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(input).toHaveValue('');
  });

  it('keeps the input value after successful add when toggle is on', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    await user.click(screen.getByRole('checkbox', { name: t.keepInputToggle }));

    const input = screen.getByPlaceholderText(t.todoPlaceholder);
    await user.type(input, 'My task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(input).toHaveValue('My task');
  });

  it('does not call create when the input is empty', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    renderForm(repo);

    await user.click(screen.getByRole('button', { name: t.todoAdd }));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('can submit a second item via Enter while first cloud create is pending', async () => {
    const user = userEvent.setup();
    // First create hangs (simulates slow Firestore). Second resolves normally.
    const repo = makeRepo({
      create: vi.fn()
        .mockReturnValueOnce(new Promise<string>(() => {}))
        .mockResolvedValue('second-id'),
    });
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    // First create is still pending — type a second item and submit via Enter
    await user.type(input, 'Second task{Enter}');

    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenNthCalledWith(2, {
      title: 'Second task',
      reminders: [],
    });
  });
});

// --- tests against the real localTodoRepo (uses localStorage + CHANGE_EVENT) ---

describe('TodoForm — submit with real localTodoRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears and re-enables the input after the first successful add', async () => {
    const user = userEvent.setup();
    const repo = createLocalTodoRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('');
  });

  it('returns focus to the input after successful add', async () => {
    const user = userEvent.setup();
    const repo = createLocalTodoRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    expect(input).toHaveFocus();
  });

  it('accepts a second add after the first', async () => {
    const user = userEvent.setup();
    const repo = createLocalTodoRepo();
    renderForm(repo);

    const input = screen.getByPlaceholderText(t.todoPlaceholder);

    await user.type(input, 'First task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    await user.type(input, 'Second task');
    await user.click(screen.getByRole('button', { name: t.todoAdd }));

    const stored = JSON.parse(localStorage.getItem(LOCAL_TODOS_KEY) ?? '[]');
    const titles = stored.map((t: { title: string }) => t.title);
    expect(titles).toContain('First task');
    expect(titles).toContain('Second task');
  });
});
