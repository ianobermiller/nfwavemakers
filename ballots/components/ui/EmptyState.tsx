import type { ReactNode } from 'react';

export function EmptyState({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">{children}</p>;
}
