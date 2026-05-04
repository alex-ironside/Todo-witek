import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import InstallGroup from './InstallGroup';

describe('InstallGroup', () => {
  it('returns null when canInstall is false', () => {
    const { container } = render(
      <InstallGroup canInstall={false} onInstall={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title + helper when canInstall', () => {
    const { getByText } = render(
      <InstallGroup canInstall={true} onInstall={() => {}} />
    );
    expect(getByText('Zainstaluj aplikację')).toBeInTheDocument();
    expect(getByText('Dodaj do ekranu początkowego, aby otwierać szybciej.')).toBeInTheDocument();
  });

  it('clicking the row calls onInstall', () => {
    const onInstall = vi.fn();
    const { getByRole } = render(
      <InstallGroup canInstall={true} onInstall={onInstall} />
    );
    fireEvent.click(getByRole('button'));
    expect(onInstall).toHaveBeenCalled();
  });
});
