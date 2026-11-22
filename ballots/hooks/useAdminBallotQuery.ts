import { useEffect, useRef, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { collections, errorMessage, pb } from '../data/pocketbase.ts';

type QueryState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T; error?: string }
  | { status: 'error'; error: string };

const watched = [
  collections.debates,
  collections.ballots,
  collections.speakerEvals,
  collections.users,
];

export function useAdminBallotQuery<T>(
  load: () => Promise<T>,
  affects: (
    collection: string,
    record: RecordModel,
    data: T | undefined,
    action: string,
  ) => boolean,
) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const retryRef = useRef<() => void>(() => {});
  const dataRef = useRef<T | undefined>(undefined);
  const affectsRef = useRef(affects);
  useEffect(() => {
    affectsRef.current = affects;
  }, [affects]);

  useEffect(() => {
    let active = true;
    let running = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscriptionError: string | undefined;
    dataRef.current = undefined;

    const isActive = (): boolean => active && pb.authStore.isValid;
    const needsRefresh = (): boolean => dirty;
    const refresh = async (): Promise<void> => {
      if (!isActive()) return;
      if (running) {
        dirty = true;
        return;
      }
      running = true;
      dirty = false;
      try {
        const data = await load();
        if (isActive()) {
          dataRef.current = data;
          setState({
            status: 'ready',
            data,
            ...(subscriptionError ? { error: subscriptionError } : {}),
          });
        }
      } catch (error: unknown) {
        if (isActive()) {
          const message = errorMessage(error, 'Couldn’t load ballots.');
          setState((previous) =>
            previous.status === 'ready'
              ? { ...previous, error: message }
              : { status: 'error', error: message },
          );
        }
      } finally {
        running = false;
        if (isActive() && needsRefresh()) schedule();
      }
    };

    function schedule(): void {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 100);
    }

    const failedSubscriptions = new Set<string>();

    // Subscribe before loading so a change during the first request is replayed.
    const subscribe = (collection: string) =>
      pb
        .collection(collection)
        .subscribe('*', (event) => {
          if (
            dataRef.current === undefined ||
            affectsRef.current(collection, event.record, dataRef.current, event.action)
          )
            schedule();
        })
        .then((stop) => {
          if (!active) void stop();
          failedSubscriptions.delete(collection);
          return stop;
        })
        .catch((error: unknown) => {
          failedSubscriptions.add(collection);
          const message = errorMessage(error, 'Live updates are unavailable. Try again.');
          subscriptionError = message;
          if (active)
            setState((previous) =>
              previous.status === 'ready' ? { ...previous, error: message } : previous,
            );
          return (): void => {};
        });
    const subscriptions = watched.map(subscribe);
    retryRef.current = () => {
      setState({ status: 'loading' });
      subscriptionError = undefined;
      const retries = [...failedSubscriptions].map(subscribe);
      subscriptions.push(...retries);
      void Promise.all(retries).then(() => refresh());
    };
    void Promise.all(subscriptions).then(() => refresh());
    return () => {
      active = false;
      retryRef.current = () => {};
      clearTimeout(timer);
      for (const subscription of subscriptions) void subscription.then((stop) => stop());
    };
  }, [load]);

  return { state, retry: (): void => retryRef.current() };
}
