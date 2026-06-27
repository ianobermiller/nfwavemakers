import { useRef, useState } from 'react';

const UNDO_DURATION_MS = 5000;

export function useUndoDelete<T>(
  onDelete: (payload: T) => void,
  onUndo: (payload: T) => void,
): {
  pendingDeletes: Map<string, T>;
  softDelete: (id: string, payload: T) => void;
  undo: (id: string) => void;
} {
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, T>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function softDelete(id: string, payload: T): void {
    onDelete(payload);
    setPendingDeletes((prev) => new Map(prev).set(id, payload));
    const timer = setTimeout(() => {
      setPendingDeletes((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, UNDO_DURATION_MS);
    timers.current.set(id, timer);
  }

  function undo(id: string): void {
    const payload = pendingDeletes.get(id);
    if (payload == null) return;
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    onUndo(payload);
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  return { pendingDeletes, softDelete, undo };
}
