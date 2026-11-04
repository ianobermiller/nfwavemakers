import { useState, useEffect, useTransition } from 'react';

function getRoute(): string {
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

export function usePathRoute(): { path: string; isPending: boolean } {
  const [path, setPath] = useState(getRoute);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = (): void => {
      startTransition(() => {
        setPath(getRoute());
      });
    };
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, [startTransition]);

  return { path, isPending };
}

export function navigate(path: string): void {
  const next = path.replace(/^\/+|\/+$/g, '');
  // Mark in-app navigations so BackLink can history.back() instead of leaving the site.
  history.pushState({ appNav: true }, '', next ? `/${next}` : '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
