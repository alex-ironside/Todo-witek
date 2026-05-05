import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TransferGroup from './TransferGroup';

const baseProps = {
  localCount: 0,
  busy: false,
  message: null as string | null,
  onTransfer: vi.fn(),
};

describe('TransferGroup', () => {
  it('returns null when localCount is 0 and there is no message', () => {
    const { container } = render(<TransferGroup {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title, helper, and a button with the local count when localCount > 0', () => {
    const { getByRole, getByText } = render(
      <TransferGroup {...baseProps} localCount={3} />
    );
    expect(getByText('Przenieś z urządzenia')).toBeInTheDocument();
    const button = getByRole('button');
    expect(button.textContent).toContain('3');
  });

  it('clicking the button calls onTransfer', () => {
    const onTransfer = vi.fn();
    const { getByRole } = render(
      <TransferGroup {...baseProps} localCount={1} onTransfer={onTransfer} />
    );
    fireEvent.click(getByRole('button'));
    expect(onTransfer).toHaveBeenCalled();
  });

  it('disables the button while busy', () => {
    const { getByRole } = render(
      <TransferGroup {...baseProps} localCount={2} busy={true} />
    );
    expect(getByRole('button')).toBeDisabled();
  });

  it('renders a success/info message when provided even with localCount=0', () => {
    const { getByText } = render(
      <TransferGroup {...baseProps} localCount={0} message="Przeniesiono 2" />
    );
    expect(getByText('Przeniesiono 2')).toBeInTheDocument();
  });
});
