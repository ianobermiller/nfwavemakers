import type { ReactNode } from 'react';

export function CenteredPanel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-start justify-center px-4 py-8 sm:py-16">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl sm:p-8 dark:bg-slate-800">
        {children}
      </div>
    </div>
  );
}
