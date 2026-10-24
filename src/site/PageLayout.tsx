import type { ReactNode } from 'react';
import { SiteLayout } from './SiteLayout.tsx';

export function PageLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <SiteLayout current="ballots">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-12">{children}</div>
    </SiteLayout>
  );
}
