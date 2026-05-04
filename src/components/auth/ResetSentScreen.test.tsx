import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetSentScreen from './ResetSentScreen';
import { t } from '../../i18n';

describe('ResetSentScreen', () => {
  it('renders title and body', () => {
    render(<ResetSentScreen onBackToLogin={() => {}} />);
    expect(
      screen.getByRole('heading', { name: t.resetSentTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.resetSentBody)).toBeInTheDocument();
  });

  it('calls onBackToLogin when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBackToLogin = vi.fn();
    render(<ResetSentScreen onBackToLogin={onBackToLogin} />);
    await user.click(screen.getByRole('button', { name: t.resetBack }));
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});
