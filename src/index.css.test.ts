import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');

describe('index.css theme tokens (THEME-01, THEME-03)', () => {
  it('imports tailwindcss', () => {
    expect(css).toMatch(/@import\s+["']tailwindcss["'];?/);
  });

  it('declares an @theme block', () => {
    expect(css).toMatch(/@theme\s*\{/);
  });

  const colorTokens = [
    '--color-bg',
    '--color-bgRaised',
    '--color-bgSheet',
    '--color-hairline',
    '--color-hairlineSoft',
    '--color-text',
    '--color-textDim',
    '--color-textMute',
    '--color-accent',
    '--color-accentInk',
    '--color-danger',
  ] as const;

  it.each(colorTokens)('declares %s as oklch()', (token) => {
    const re = new RegExp(`${token}\\s*:\\s*oklch\\(`);
    expect(css).toMatch(re);
  });

  it('declares radii field/group/sheet at 12/16/24px', () => {
    expect(css).toMatch(/--radius-field\s*:\s*12px/);
    expect(css).toMatch(/--radius-group\s*:\s*16px/);
    expect(css).toMatch(/--radius-sheet\s*:\s*24px/);
  });

  it('declares --font-sans starting with Inter', () => {
    expect(css).toMatch(/--font-sans\s*:\s*Inter/);
  });
});
