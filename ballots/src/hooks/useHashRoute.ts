import { useState, useEffect } from 'react';

const BASE = '/ballots';

function getRoute(): string {
  const pathname = window.location.pathname;
  const relative = pathname.startsWith(BASE + '/')
    ? pathname.slice(BASE.length + 1)
    : pathname.startsWith(BASE)
      ? ''
      : pathname.slice(1);
  return relative || 'dashboard';
}

export function useHashRoute(): string {
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
  history.pushState(null, '', BASE + '/' + path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
