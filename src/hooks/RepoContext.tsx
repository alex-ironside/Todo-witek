import { createContext, useContext, type ReactNode } from 'react';
import type { CategoryRepository, TodoRepository } from '../types';

const RepoContext = createContext<TodoRepository | null>(null);
const CategoryRepoContext = createContext<CategoryRepository | null>(null);

interface ProviderProps {
  repo: TodoRepository;
  categoryRepo?: CategoryRepository;
  children: ReactNode;
}

export function RepoProvider({ repo, categoryRepo, children }: ProviderProps) {
  return (
    <RepoContext.Provider value={repo}>
      <CategoryRepoContext.Provider value={categoryRepo ?? null}>
        {children}
      </CategoryRepoContext.Provider>
    </RepoContext.Provider>
  );
}

export const useRepo = (): TodoRepository => {
  const repo = useContext(RepoContext);
  if (!repo) throw new Error('useRepo must be used inside <RepoProvider>');
  return repo;
};

// Returns the category repo if one was provided. Components that own
// category UI should treat null as "no category management available
// in this mode" and fall back gracefully.
export const useCategoryRepo = (): CategoryRepository | null =>
  useContext(CategoryRepoContext);
