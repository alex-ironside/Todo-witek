import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SettingsGroup from './SettingsGroup';

describe('SettingsGroup', () => {
  it('renders children inside a bg-bgRaised rounded-group container', () => {
    const { getByText, container } = render(
      <SettingsGroup>
        <span>hello</span>
      </SettingsGroup>
    );
    expect(getByText('hello')).toBeInTheDocument();
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-bgRaised');
    expect(card.className).toContain('rounded-group');
  });

  it('renders title when provided', () => {
    const { getByText } = render(
      <SettingsGroup title="Wygląd"><span>x</span></SettingsGroup>
    );
    expect(getByText('Wygląd')).toBeInTheDocument();
  });

  it('omits title element when title not provided', () => {
    const { container } = render(
      <SettingsGroup><span>x</span></SettingsGroup>
    );
    expect(container.querySelector('[data-testid="settings-group-title"]')).toBeNull();
  });
});
