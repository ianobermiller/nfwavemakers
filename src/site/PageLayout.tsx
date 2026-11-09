import { useEffect, type ReactNode } from 'react';
import { SiteLayout } from './SiteLayout.tsx';

export function clubPageTitle(page: string): string {
  return `${page} — North Florida Wavemakers`;
}

export function PageLayout({
  children,
  title = 'Ballots',
}: {
  children: ReactNode;
  title?: string;
}): React.JSX.Element {
  useEffect(() => {
    document.title = clubPageTitle(title);
  }, [title]);

  return (
    <SiteLayout current="ballots">
      <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-5 pb-12 sm:px-4 sm:py-6">
        {children}
      </div>
    </SiteLayout>
  );
}
