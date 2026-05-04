import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Reminder } from '../../types';
import ReminderBadge from './ReminderBadge';

describe('ReminderBadge', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when reminders is empty', () => {
    const { container } = render(<ReminderBadge reminders={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the soonest unfired reminder relative time', () => {
    const reminders: Reminder[] = [
      { id: 'a', remindAt: NOW + 3600_000, fired: false },
      { id: 'b', remindAt: NOW + 7200_000, fired: false },
    ];
    const { getByText, getByTestId } = render(<ReminderBadge reminders={reminders} />);
    expect(getByText(/godz/i)).toBeInTheDocument();
    expect(getByTestId('reminder-bell')).toBeInTheDocument();
  });

  it('skips fired reminders when picking soonest', () => {
    const reminders: Reminder[] = [
      { id: 'a', remindAt: NOW + 60_000, fired: true },
      { id: 'b', remindAt: NOW + 2 * 3600_000, fired: false },
    ];
    const { getByText } = render(<ReminderBadge reminders={reminders} />);
    expect(getByText(/godz/i)).toBeInTheDocument();
  });

  it('renders nothing when all reminders are fired', () => {
    const reminders: Reminder[] = [
      { id: 'a', remindAt: NOW + 60_000, fired: true },
    ];
    const { container } = render(<ReminderBadge reminders={reminders} />);
    expect(container.firstChild).toBeNull();
  });
});
