import { createContext, useContext, type ReactNode } from 'react';
import type { TodoRepository } from '../types';

const RepoContext = createContext<TodoRepository | null>(null);

interface ProviderProps {
  repo: TodoRepository;
  children: ReactNode;
}

export function RepoProvider({ repo, children }: ProviderProps) {
  return <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>;
}

export const useRepo = (): TodoRepository => {
  const repo = useContext(RepoContext);
  if (!repo) throw new Error('useRepo must be used inside <RepoProvider>');
  return repo;
};
