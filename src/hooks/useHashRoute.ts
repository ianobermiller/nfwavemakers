import { useState, useEffect, useTransition } from 'react';

function getRoute(): string {
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

export function usePathRoute(): { path: string; isPending: boolean } {
  const [path, setPath] = useState(getRoute);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const apply = (urgent: boolean): void => {
      const next = getRoute();
      if (urgent) {
        setPath(next);
        return;
      }
      startTransition(() => {
        setPath(next);
      });
    };
    // Browser Back/Forward. A transition here can be dropped, so apply it now.
    const onPop = (): void => apply(true);
    // In-app links use a transition so the current screen stays up while the next loads.
    // Redirects are urgent: a transition started from an effect never commits.
    const onRoute = (event: Event): void => {
      apply(event instanceof CustomEvent && event.detail === 'urgent');
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('app-route', onRoute);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('app-route', onRoute);
    };
  }, [startTransition]);

  return { path, isPending };
}

function pushRoute(path: string): void {
  const next = path.replace(/^\/+|\/+$/g, '');
  const url = next ? `/${next}` : '/';
  if (window.location.pathname === url) return;
  // Mark in-app navigations so BackLink can history.back() instead of leaving the site.
  history.pushState({ appNav: true }, '', url);
}

export function navigate(path: string): void {
  pushRoute(path);
  window.dispatchEvent(new CustomEvent('app-route'));
}

/** Leave a gate (signed-out page, finished sign-in) without waiting on a transition. */
export function redirect(path: string): void {
  pushRoute(path);
  window.dispatchEvent(new CustomEvent('app-route', { detail: 'urgent' }));
}
