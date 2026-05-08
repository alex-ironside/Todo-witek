import { describe, it, expect } from 'vitest';
import { resolveTodoCategory } from './resolveCategory';
import { UNCATEGORIZED, type Category } from '../types';

const cats: Category[] = [
  { id: 'autoPriv123', ownerId: 'u', name: 'Prywatne', position: 1 },
  { id: 'autoSluz456', ownerId: 'u', name: 'Służbowe', position: 2 },
];

describe('resolveTodoCategory', () => {
  it('returns the id when the todo points at a category that exists', () => {
    expect(resolveTodoCategory('autoPriv123', cats)).toBe('autoPriv123');
  });

  it('maps the legacy literal "prywatne" to the user category named "Prywatne"', () => {
    expect(resolveTodoCategory('prywatne', cats)).toBe('autoPriv123');
  });

  it('maps the legacy literal "sluzbowe" to the user category named "Służbowe" (case- and diacritic-insensitive)', () => {
    expect(resolveTodoCategory('sluzbowe', cats)).toBe('autoSluz456');
  });

  it('returns UNCATEGORIZED when the todo has no category', () => {
    expect(resolveTodoCategory(undefined, cats)).toBe(UNCATEGORIZED);
  });

  it('returns UNCATEGORIZED for an unknown id with no name fallback', () => {
    expect(resolveTodoCategory('does-not-exist', cats)).toBe(UNCATEGORIZED);
  });

  it('returns UNCATEGORIZED for the explicit sentinel value', () => {
    expect(resolveTodoCategory(UNCATEGORIZED, cats)).toBe(UNCATEGORIZED);
  });

  it('returns UNCATEGORIZED when no categories are loaded yet', () => {
    expect(resolveTodoCategory('prywatne', [])).toBe(UNCATEGORIZED);
  });

  it('falls back to UNCATEGORIZED if the named legacy match is missing (e.g. user renamed "Prywatne")', () => {
    const renamed: Category[] = [
      { id: 'x', ownerId: 'u', name: 'Personal', position: 1 },
    ];
    expect(resolveTodoCategory('prywatne', renamed)).toBe(UNCATEGORIZED);
  });
});
