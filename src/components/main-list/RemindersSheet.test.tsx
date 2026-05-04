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
  it('exposes the datetime-local input as the labeled "Wybierz termin" affordance', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByLabelText('Wybierz termin') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('datetime-local');
    expect(input.tabIndex).not.toBe(-1);
    expect(input.getAttribute('aria-hidden')).not.toBe('true');
  });

  // iOS Safari opens the native picker the moment a datetime-local input
  // receives focus. Sheet auto-focuses the first focusable child on open, so
  // the datetime-local must NOT be that first child — otherwise the picker
  // pops on sheet mount instead of when the user taps "Dodaj termin", and the
  // input stays focused so subsequent taps don't reopen it.
  it('places a non-input focusable before the datetime-local in DOM order', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button,input,a,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    );
    const input = screen.getByLabelText('Wybierz termin') as HTMLInputElement;
    const inputIndex = focusables.indexOf(input);
    expect(inputIndex).toBeGreaterThan(0);
    const first = focusables[0];
    expect(first.tagName).not.toBe('INPUT');
  });

  // Datetime-local pickers fire `change` for every field the user adjusts
  // (year, month, day, hour, minute) on many platforms. Committing on each
  // change creates a reminder per field touched. Picking must stage a
  // pending value; the user explicitly confirms it via "Dodaj termin".
  it('changing the hidden input does NOT add a reminder yet (requires confirm)', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('confirm button is disabled when no value has been picked', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    expect(screen.getByRole('button', { name: 'Dodaj termin' })).toBeDisabled();
  });

  it('confirm button enables once a value is picked', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    expect(screen.getByRole('button', { name: 'Dodaj termin' })).toBeEnabled();
  });

  it('clicking confirm with a pending value adds the reminder snapped to 15 min', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj termin' }));
    const call = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('t1');
    const reminders = call[1].reminders as Reminder[];
    expect(reminders).toHaveLength(1);
    expect(reminders[0].remindAt % FIFTEEN_MIN_MS).toBe(0);
    expect(new Date(reminders[0].remindAt).getMinutes()).toBe(15);
    expect(reminders[0].fired).toBe(false);
  });

  it('successive picks before confirm only stage the last value', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    fireEvent.change(input, { target: { value: '2026-05-04T11:08' } });
    fireEvent.change(input, { target: { value: '2026-05-04T12:08' } });
    expect(repo.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj termin' }));
    expect(repo.update).toHaveBeenCalledTimes(1);
    const reminders = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .reminders as Reminder[];
    expect(reminders).toHaveLength(1);
    expect(new Date(reminders[0].remindAt).getHours()).toBe(12);
  });

  it('clears the input value after a successful confirm', () => {
    const repo = makeRepo();
    render(wrap(<RemindersSheet todo={todo()} onClose={() => {}} />, repo));
    const input = screen.getByTestId('reminder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-04T10:08' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj termin' }));
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
