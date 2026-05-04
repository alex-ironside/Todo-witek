import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';

const mockUseUpdatePrompt = vi.fn();
vi.mock('../hooks/useUpdatePrompt', () => ({
  useUpdatePrompt: () => mockUseUpdatePrompt(),
}));

import UpdatePrompt from './UpdatePrompt';

describe('UpdatePrompt', () => {
  beforeEach(() => {
    mockUseUpdatePrompt.mockReset();
  });

  it('renders nothing when no update is available', () => {
    mockUseUpdatePrompt.mockReturnValue({
      needRefresh: false,
      applyUpdate: vi.fn(),
      dismiss: vi.fn(),
    });
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an update banner when needRefresh is true', () => {
    mockUseUpdatePrompt.mockReturnValue({
      needRefresh: true,
      applyUpdate: vi.fn(),
      dismiss: vi.fn(),
    });
    render(<UpdatePrompt />);
    expect(screen.getByText(/Dostępna jest nowa wersja/i)).toBeInTheDocument();
  });

  it('clicking the update button calls applyUpdate', async () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    mockUseUpdatePrompt.mockReturnValue({
      needRefresh: true,
      applyUpdate,
      dismiss: vi.fn(),
    });
    render(<UpdatePrompt />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /zaktualizuj/i }));
    });
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('clicking the dismiss button calls dismiss', () => {
    const dismiss = vi.fn();
    mockUseUpdatePrompt.mockReturnValue({
      needRefresh: true,
      applyUpdate: vi.fn(),
      dismiss,
    });
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: /później/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
