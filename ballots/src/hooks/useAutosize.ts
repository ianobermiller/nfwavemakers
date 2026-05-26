import { useEffect, type RefObject } from 'react';

export function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, value: string): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
