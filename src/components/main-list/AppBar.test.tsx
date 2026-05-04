import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AppBar from './AppBar';

describe('AppBar', () => {
  it('renders hamburger, brand, and settings buttons', () => {
    const { getByLabelText, getByText } = render(
      <AppBar onOpenDrawer={() => {}} onOpenSettings={() => {}} />
    );
    expect(getByLabelText('Otwórz menu')).toBeInTheDocument();
    expect(getByLabelText('Otwórz ustawienia')).toBeInTheDocument();
    expect(getByText('Todo')).toBeInTheDocument();
  });

  it('fires onOpenDrawer when hamburger clicked', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(
      <AppBar onOpenDrawer={spy} onOpenSettings={() => {}} />
    );
    fireEvent.click(getByLabelText('Otwórz menu'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fires onOpenSettings when cog clicked', () => {
    const spy = vi.fn();
    const { getByLabelText } = render(
      <AppBar onOpenDrawer={() => {}} onOpenSettings={spy} />
    );
    fireEvent.click(getByLabelText('Otwórz ustawienia'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('header has hairline-bottom border classes', () => {
    const { container } = render(
      <AppBar onOpenDrawer={() => {}} onOpenSettings={() => {}} />
    );
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.className).toMatch(/border-b/);
    expect(header?.className).toMatch(/border-hairline(Soft)?/);
  });
});
