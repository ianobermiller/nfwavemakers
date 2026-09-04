import { useState, useEffect } from 'react';

function getRoute(): string {
  const relative = window.location.pathname.replace(/^\/+|\/+$/g, '');
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
  history.pushState(null, '', '/' + path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
