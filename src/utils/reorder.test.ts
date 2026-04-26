import { describe, it, expect } from 'vitest';
import { reorderIds, moveById } from './reorder';

describe('reorderIds', () => {
  it('moves an item up', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 2, 0)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('moves an item down', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 0, 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('returns the same array when from === to', () => {
    const ids = ['a', 'b', 'c'];
    expect(reorderIds(ids, 1, 1)).toBe(ids);
  });

  it('ignores out-of-range indices', () => {
    const ids = ['a', 'b', 'c'];
    expect(reorderIds(ids, -1, 0)).toBe(ids);
    expect(reorderIds(ids, 0, 5)).toBe(ids);
  });
});

describe('moveById', () => {
  it('moves by id', () => {
    expect(moveById(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('returns the same array when an id is missing', () => {
    const ids = ['a', 'b'];
    expect(moveById(ids, 'x', 'a')).toBe(ids);
    expect(moveById(ids, 'a', 'x')).toBe(ids);
  });
});
