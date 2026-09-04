import { useCallback, useEffect, useRef } from 'react';

interface Options {
  delay?: number;
  flushOnUnmount?: boolean;
}

export function useDebouncedSave(
  saveFn: () => void,
  { delay = 500, flushOnUnmount = false }: Options = {},
): { schedule: () => void; cancel: () => void } {
  const saveFnRef = useRef(saveFn);

  useEffect(() => {
    saveFnRef.current = saveFn;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (flushOnUnmount) saveFnRef.current();
      }
    };
  }, [flushOnUnmount]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      saveFnRef.current();
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { schedule, cancel };
}
