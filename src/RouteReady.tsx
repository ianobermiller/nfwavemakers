import { Component, Suspense, type ReactNode } from 'react';
import { clearLiveErrors } from '../ballots/lib/liveQuery.ts';
import { RouteSkeleton } from './RouteSkeleton.tsx';
import { SiteLayout } from './site/SiteLayout.tsx';

type NavPage = 'home' | 'about' | 'schedule' | 'lessons' | 'ballots' | 'join';

function navCurrent(path: string): NavPage {
  const segment = path.split('/')[0] ?? '';
  if (segment === 'about') return 'about';
  if (segment === 'schedule') return 'schedule';
  if (segment === 'lessons' || segment === 'admin-lessons') return 'lessons';
  if (segment === 'join') return 'join';
  if (segment === '') return 'home';
  return 'ballots';
}

function NavigationPending({ pending }: { pending: boolean }): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden={pending ? undefined : true}
        aria-valuetext={pending ? 'Loading page' : undefined}
        className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-white transition-opacity ${
          pending ? 'animate-pulse opacity-100' : 'opacity-0'
        }`}
        role="progressbar"
      />
      <div aria-live="polite" className="sr-only">
        {pending ? 'Loading page' : ''}
      </div>
    </>
  );
}

function RouteFallback({ path }: { path: string }): React.JSX.Element {
  return (
    <SiteLayout current={navCurrent(path)}>
      <RouteSkeleton path={path} />
    </SiteLayout>
  );
}

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  error: unknown;
}

class RouteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: undefined };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: unknown): void {
    console.error('Page failed to load', error);
  }

  private retry = (): void => {
    clearLiveErrors();
    this.setState({ error: undefined });
  };

  override render(): ReactNode {
    if (this.state.error === undefined) return this.props.children;
    return (
      <SiteLayout current="ballots">
        <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-5 sm:px-4 sm:py-6">
          <p className="text-sm text-slate-700 dark:text-slate-200">Couldn’t load this page.</p>
          <button
            className="mt-3 cursor-pointer rounded-lg border-none bg-nf-blue px-3 py-2 text-sm font-semibold text-white dark:bg-nf-blue-d"
            onClick={this.retry}
            type="button"
          >
            Try again
          </button>
        </div>
      </SiteLayout>
    );
  }
}

export function RouteReady({
  path,
  pending,
  children,
}: {
  path: string;
  pending: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <>
      <NavigationPending pending={pending} />
      <Suspense fallback={<RouteFallback path={path} />}>
        <RouteErrorBoundary key={path}>{children}</RouteErrorBoundary>
      </Suspense>
    </>
  );
}
