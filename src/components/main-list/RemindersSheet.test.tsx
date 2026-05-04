import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RemindersSheet from './RemindersSheet';
import { RepoProvider } from '../../hooks/RepoContext';
import type { Todo, TodoRepository, Reminder } from '../../types';
import { FIFTEEN_MIN_MS } from '../../utils/snapToFifteen';

const makeRepo = (): TodoRepository => ({
  create: vi.fn().mockResolvedValue('id'),
  update: vi.fn().mockResolvedValue(undefined),
  toggleDone: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  reorder: vi.fn().mockResolvedValue(undefined),
  observe: vi.fn(() => () => {}),
});

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  id: 'r1',
  remindAt: new Date('2026-05-05T14:30:00').getTime(),
  fired: false,
  ...over,
});

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't1',
  ownerId: 'u',
  title: 'Buy milk',
  done: false,
  reminders: [],
  ...over,
});

const wrap = (ui: React.ReactNode, repo: TodoRepository) => (
  <RepoProvider repo={repo}>{ui}</RepoProvider>
);

describe('RemindersSheet', () => {
  it('hides the dialog when todo is null', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={null} onClose={() => {}} />, repo));
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('translate-y-full');
  });

  it('shows the dialog and empty-state copy for a todo with no reminders', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    expect(screen.getByText('Bez przypomnień.')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('translate-y-0');
  });

  it('renders the todo title in the subtitle', () => {
    const repo = makeRepo();
    render(
      wrap(<RemindersSheet todo={todo({ title: 'Kup mleko' })} onClose={() => {}} />, repo)
    );
    expect(screen.getByText(/Kup mleko/)).toBeInTheDocument();
  });

  it('renders one row per reminder, with wysłane only on the fired one', () => {
    const repo = makeRepo();
    const t = todo({
      reminders: [
        reminder({ id: 'a', fired: false }),
        reminder({ id: 'b', remindAt: new Date('2026-05-06T09:00').getTime(), fired: true }),
      ],
    });
    render(wrap(<RemindersSheet todo={t} onClose={() => {}} />, repo));
    expect(screen.getAllByTestId('bell-icon')).toHaveLength(2);
    expect(screen.getAllByText('wysłane')).toHaveLength(1);
  });

  it('clicking × calls repo.update with the remaining reminders', () => {
    const repo = makeRepo();
    const r1 = reminder({ id: 'keep' });
    const r2 = reminder({ id: 'gone', remindAt: new Date('2026-05-06T09:00').getTime() });
    const t = todo({ reminders: [r1, r2] });
    render(wrap(<RemindersSheet todo={t} onClose={() => {}} />, repo));
    const removeBtns = screen.getAllByRole('button').filter(
      (b) => b.textContent === '×'
    );
    fireEvent.click(removeBtns[1]);
    expect(repo.update).toHaveBeenCalledWith('t1', {
      reminders: [r1],
    });
  });

  // iOS Safari does not implement showPicker() for datetime-local. The reliable
  // cross-browser pattern is to overlay the real input on top of the visual
  // button so the user's tap lands directly on the input — the OS then opens
  // its native picker via standard input activation (no JS API needed).
  it('exposes the datetime-local input as the labeled "Dodaj termin" affordance', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByLabelText('Dodaj termin') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('datetime-local');
    expect(input.tabIndex).not.toBe(-1);
    expect(input.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('changing the hidden input adds a reminder snapped to 15 min', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    const call = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('t1');
    const reminders = call[1].reminders as Reminder[];
    expect(reminders).toHaveLength(1);
    expect(reminders[0].remindAt % FIFTEEN_MIN_MS).toBe(0);
    expect(new Date(reminders[0].remindAt).getMinutes()).toBe(15);
    expect(reminders[0].fired).toBe(false);
  });

  it('clears the input value after a successful add', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    expect(input.value).toBe('');
  });

  it('Anuluj button calls onClose', () => {
    const onClose = vi.fn();
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={onClose} />, repo));
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc closes the sheet via Sheet primitive', () => {
    const onClose = vi.fn();
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={onClose} />, repo));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
