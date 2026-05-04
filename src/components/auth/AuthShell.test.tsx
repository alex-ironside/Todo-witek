import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthShell from './AuthShell';

describe('AuthShell', () => {
  it('renders the brand mark', () => {
    render(
      <AuthShell>
        <div>child</div>
      </AuthShell>,
    );
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('renders children below the brand', () => {
    render(
      <AuthShell>
        <p>hello</p>
      </AuthShell>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
