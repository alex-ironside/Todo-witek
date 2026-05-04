import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { RepoProvider } from '../../hooks/RepoContext';
import type { TodoRepository } from '../../types';
import AddTodoRow from './AddTodoRow';

function makeRepo(overrides: Partial<TodoRepository> = {}): TodoRepository {
  return {
    create: vi.fn().mockResolvedValue('id-1'),
    update: vi.fn().mockResolvedValue(undefined),
    toggleDone: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn(() => () => {}),
    ...overrides,
  };
}

const wrap = (repo: TodoRepository, ui: React.ReactNode) => (
  <RepoProvider repo={repo}>{ui}</RepoProvider>
);

describe('AddTodoRow', () => {
  let repo: TodoRepository;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('renders the input with the spec placeholder and the Dodaj button', () => {
    const { getByPlaceholderText, getByText } = render(
      wrap(repo, <AddTodoRow category="prywatne" />)
    );
    expect(getByPlaceholderText('Co dziś robisz?')).toBeInTheDocument();
    expect(getByText('Dodaj')).toBeInTheDocument();
  });

  it('submits via Enter key', async () => {
    const { getByPlaceholderText } = render(
      wrap(repo, <AddTodoRow category="prywatne" />)
    );
    const input = getByPlaceholderText('Co dziś robisz?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'kup mleko' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(repo.create).toHaveBeenCalledWith({
      title: 'kup mleko',
      reminders: [],
      category: 'prywatne',
    });
  });

  it('submits when Dodaj button clicked', async () => {
    const { getByPlaceholderText, getByText } = render(
      wrap(repo, <AddTodoRow category="sluzbowe" />)
    );
    const input = getByPlaceholderText('Co dziś robisz?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'raport' } });
    await act(async () => {
      fireEvent.click(getByText('Dodaj'));
    });
    expect(repo.create).toHaveBeenCalledWith({
      title: 'raport',
      reminders: [],
      category: 'sluzbowe',
    });
  });

  it('clears input and retains focus after submit', async () => {
    const { getByPlaceholderText } = render(
      wrap(repo, <AddTodoRow category="prywatne" />)
    );
    const input = getByPlaceholderText('Co dziś robisz?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('does not submit empty / whitespace-only input', async () => {
    const { getByPlaceholderText } = render(
      wrap(repo, <AddTodoRow category="prywatne" />)
    );
    const input = getByPlaceholderText('Co dziś robisz?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('disables the Dodaj button when input is empty or whitespace', () => {
    const { getByPlaceholderText, getByText } = render(
      wrap(repo, <AddTodoRow category="prywatne" />)
    );
    const button = getByText('Dodaj') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('Co dziś robisz?'), { target: { value: 'x' } });
    expect(button.disabled).toBe(false);
  });
});
