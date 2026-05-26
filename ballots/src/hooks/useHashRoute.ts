import { useState, useEffect } from 'react';

export function useHashRoute(): string {
  const [path, setPath] = useState(() => window.location.pathname.slice(1) || 'dashboard');

  useEffect(() => {
    const handler = (): void => {
      setPath(window.location.pathname.slice(1) || 'dashboard');
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
