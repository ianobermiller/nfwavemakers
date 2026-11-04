import { useState, useEffect } from 'react';

function getRoute(): string {
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

export function usePathRoute(): string {
  const [path, setPath] = useState(getRoute);

  useEffect(() => {
    const handler = (): void => {
      setPath(getRoute());
    };
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  return path;
}

export function navigate(path: string): void {
  const next = path.replace(/^\/+|\/+$/g, '');
  // Mark in-app navigations so BackLink can history.back() instead of leaving the site.
  history.pushState({ appNav: true }, '', next ? `/${next}` : '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
