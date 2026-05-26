import { useState, useEffect } from 'react';

export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || 'dashboard');

  useEffect(() => {
    const handler = (): void => {
      setHash(window.location.hash.slice(1) || 'dashboard');
    };
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
    };
  }, []);

  return hash;
}

export function navigate(path: string): void {
  window.location.hash = path;
}
