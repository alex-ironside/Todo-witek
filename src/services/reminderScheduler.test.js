import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReminderScheduler } from './reminderScheduler.js';

describe('reminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires due reminders immediately on sync', () => {
    const notify = vi.fn();
    const onFired = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired });
    scheduler.sync([
      {
        id: 't1',
        title: 'Past',
        reminders: [{ id: 'r1', remindAt: Date.now() - 1000, fired: false }],
      },
    ]);
    expect(notify).toHaveBeenCalledWith('Past', expect.any(Object));
    expect(onFired).toHaveBeenCalledWith('t1', 'r1');
  });

  it('schedules a future reminder via setTimeout', () => {
    const notify = vi.fn();
    const onFired = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired });
    scheduler.sync([
      {
        id: 't1',
        title: 'Future',
        reminders: [{ id: 'r1', remindAt: Date.now() + 5000, fired: false }],
      },
    ]);
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(notify).toHaveBeenCalledWith('Future', expect.any(Object));
    expect(onFired).toHaveBeenCalledWith('t1', 'r1');
  });

  it('skips already-fired reminders', () => {
    const notify = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired: vi.fn() });
    scheduler.sync([
      {
        id: 't1',
        title: 'Done',
        reminders: [{ id: 'r1', remindAt: Date.now() - 1000, fired: true }],
      },
    ]);
    expect(notify).not.toHaveBeenCalled();
  });

  it('cancels old timers when sync is called again', () => {
    const notify = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired: vi.fn() });
    scheduler.sync([
      {
        id: 't1',
        title: 'A',
        reminders: [{ id: 'r1', remindAt: Date.now() + 5000, fired: false }],
      },
    ]);
    scheduler.sync([]);
    vi.advanceTimersByTime(10000);
    expect(notify).not.toHaveBeenCalled();
  });

  it('stop cancels all pending timers', () => {
    const notify = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired: vi.fn() });
    scheduler.sync([
      {
        id: 't1',
        title: 'A',
        reminders: [{ id: 'r1', remindAt: Date.now() + 1000, fired: false }],
      },
    ]);
    scheduler.stop();
    vi.advanceTimersByTime(2000);
    expect(notify).not.toHaveBeenCalled();
  });

  it('skips reminders on done todos', () => {
    const notify = vi.fn();
    const scheduler = createReminderScheduler({ notify, onFired: vi.fn() });
    scheduler.sync([
      {
        id: 't1',
        title: 'Done todo',
        done: true,
        reminders: [{ id: 'r1', remindAt: Date.now() - 1000, fired: false }],
      },
    ]);
    expect(notify).not.toHaveBeenCalled();
  });
});
