import { useEffect, useRef, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import type { QueryRequest } from '../lib/cursorList.ts';
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
  load: (request: QueryRequest) => Promise<T>,
  affects: (
    collection: string,
    record: RecordModel,
    data: T | undefined,
    action: string,
  ) => boolean,
) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const moreRef = useRef<() => void>(() => {});
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
    let moreRequested = false;
    let failedRequest: QueryRequest = 'refresh';
    let failedMoreError: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscriptionError: string | undefined;
    dataRef.current = undefined;

    const isActive = (): boolean => active && pb.authStore.isValid;
    const needsRefresh = (): boolean => dirty;
    const needsMore = (): boolean => moreRequested;
    const refresh = async (request: QueryRequest = 'refresh'): Promise<void> => {
      if (!isActive()) return;
      if (running) {
        if (request === 'more') {
          moreRequested = true;
          setIsLoadingMore(true);
        } else dirty = true;
        return;
      }
      running = true;
      if (request === 'more') moreRequested = false;
      else dirty = false;
      setIsLoadingMore(request === 'more');
      try {
        const data = await load(request);
        if (isActive()) {
          if (request === 'more') {
            failedMoreError = undefined;
            failedRequest = 'refresh';
          }
          dataRef.current = data;
          const visibleError = failedMoreError ?? subscriptionError;
          setState({
            status: 'ready',
            data,
            ...(visibleError ? { error: visibleError } : {}),
          });
        }
      } catch (error: unknown) {
        if (isActive()) {
          const message = errorMessage(error, 'Couldn’t load ballots.');
          if (request === 'more') failedMoreError = message;
          if (failedMoreError === undefined) failedRequest = request;
          else failedRequest = 'more';
          setState((previous) =>
            previous.status === 'ready'
              ? { ...previous, error: failedMoreError ?? message }
              : { status: 'error', error: message },
          );
        }
      } finally {
        running = false;
        if (isActive()) {
          setIsLoadingMore(needsMore());
          if (needsRefresh()) schedule();
          else if (needsMore()) void refresh('more');
        }
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
      const request = failedRequest;
      failedMoreError = undefined;
      setState((previous) =>
        previous.status === 'ready'
          ? { status: 'ready', data: previous.data }
          : { status: 'loading' },
      );
      subscriptionError = undefined;
      const retries = [...failedSubscriptions].map(subscribe);
      subscriptions.push(...retries);
      void Promise.all(retries).then(() => refresh(request));
    };
    moreRef.current = () => {
      void refresh('more');
    };
    void Promise.all(subscriptions).then(() => refresh());
    return () => {
      active = false;
      retryRef.current = () => {};
      moreRef.current = () => {};
      clearTimeout(timer);
      for (const subscription of subscriptions) void subscription.then((stop) => stop());
    };
  }, [load]);

  return {
    state,
    isLoadingMore,
    loadMore: (): void => moreRef.current(),
    retry: (): void => retryRef.current(),
  };
}
