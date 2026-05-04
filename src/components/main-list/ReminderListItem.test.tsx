import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReminderListItem from './ReminderListItem';
import type { Reminder } from '../../types';
import { formatReminderTime } from '../../utils/formatReminderTime';

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  id: 'r1',
  remindAt: new Date('2026-05-05T14:30:00').getTime(),
  fired: false,
  ...over,
});

describe('ReminderListItem', () => {
  it('renders the formatted time', () => {
    render(<ReminderListItem reminder={reminder()} onRemove={() => {}} />);
    expect(screen.getByText(formatReminderTime(reminder().remindAt))).toBeInTheDocument();
  });

  it('renders the bell icon', () => {
    render(<ReminderListItem reminder={reminder()} onRemove={() => {}} />);
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('renders wysłane pill when fired', () => {
    render(<ReminderListItem reminder={reminder({ fired: true })} onRemove={() => {}} />);
    expect(screen.getByText('wysłane')).toBeInTheDocument();
  });

  it('does not render wysłane pill when not fired', () => {
    render(<ReminderListItem reminder={reminder()} onRemove={() => {}} />);
    expect(screen.queryByText('wysłane')).toBeNull();
  });

  it('clicking remove button calls onRemove with the reminder id', () => {
    const onRemove = vi.fn();
    render(<ReminderListItem reminder={reminder({ id: 'abc' })} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalledWith('abc');
  });

  it('remove button has aria-label referencing the formatted time', () => {
    render(<ReminderListItem reminder={reminder()} onRemove={() => {}} />);
    const formatted = formatReminderTime(reminder().remindAt);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain(formatted);
  });
});
