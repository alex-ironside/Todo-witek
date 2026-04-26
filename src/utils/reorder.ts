// Pure helpers for reorderable lists.

export const reorderIds = (
  ids: string[],
  fromIndex: number,
  toIndex: number
): string[] => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex < 0 ||
    toIndex >= ids.length
  ) {
    return ids;
  }
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const moveById = (
  ids: string[],
  fromId: string,
  toId: string
): string[] => {
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return ids;
  return reorderIds(ids, fromIndex, toIndex);
};
