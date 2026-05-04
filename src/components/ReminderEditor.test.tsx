import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReminderEditor from './ReminderEditor';
import { RepoProvider } from '../hooks/RepoContext';
import type { TodoRepository, Todo } from '../types';

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

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

describe('ReminderEditor — 15-minute snapping', () => {
  it('datetime-local input has step="900" for 15-minute increments', () => {
    render(
      <RepoProvider repo={makeRepo()}>
        <ReminderEditor todo={makeTodo()} />
      </RepoProvider>
    );
    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('step', '900');
  });

  it('snaps reminder time to nearest 15-minute boundary when saving', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <ReminderEditor todo={makeTodo()} />
      </RepoProvider>
    );
    // 2026-05-01T10:07 — should snap to 10:00 (nearest 15-min boundary)
    const input = screen.getByDisplayValue('');
    await user.type(input, '2026-05-01T10:07');
    await user.click(screen.getByRole('button'));
    const savedReminders = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.reminders;
    expect(savedReminders).toBeDefined();
    expect(savedReminders[0].remindAt % FIFTEEN_MIN_MS).toBe(0);
  });

  it('snaps a time 8+ minutes past a boundary up to the next 15-min slot', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <ReminderEditor todo={makeTodo()} />
      </RepoProvider>
    );
    // 2026-05-01T10:08 — 8 min past :00, should snap to :15
    const input = screen.getByDisplayValue('');
    await user.type(input, '2026-05-01T10:08');
    await user.click(screen.getByRole('button'));
    const savedReminders = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.reminders;
    expect(savedReminders).toBeDefined();
    expect(savedReminders[0].remindAt % FIFTEEN_MIN_MS).toBe(0);
    // Should snap to 10:15, not 10:00
    const d = new Date(savedReminders[0].remindAt);
    expect(d.getMinutes()).toBe(15);
  });

  it('snaps a time 7 minutes past a boundary down to the current 15-min slot', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <ReminderEditor todo={makeTodo()} />
      </RepoProvider>
    );
    // 2026-05-01T10:07 — 7 min past :00, should snap to :00
    const input = screen.getByDisplayValue('');
    await user.type(input, '2026-05-01T10:07');
    await user.click(screen.getByRole('button'));
    const savedReminders = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.reminders;
    expect(savedReminders).toBeDefined();
    expect(savedReminders[0].remindAt % FIFTEEN_MIN_MS).toBe(0);
    const d = new Date(savedReminders[0].remindAt);
    expect(d.getMinutes()).toBe(0);
  });

  it('preserves exact times already on a 15-minute boundary', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    render(
      <RepoProvider repo={repo}>
        <ReminderEditor todo={makeTodo()} />
      </RepoProvider>
    );
    // 2026-05-01T10:15 — already on boundary
    const input = screen.getByDisplayValue('');
    await user.type(input, '2026-05-01T10:15');
    await user.click(screen.getByRole('button'));
    const savedReminders = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.reminders;
    expect(savedReminders).toBeDefined();
    const d = new Date(savedReminders[0].remindAt);
    expect(d.getMinutes()).toBe(15);
    expect(d.getSeconds()).toBe(0);
  });
});
