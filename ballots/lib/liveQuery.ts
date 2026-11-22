type LiveEntry<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'ready'; data: T; fresh: boolean }
  | { status: 'error'; error: unknown };

interface LiveOptions {
  load: () => Promise<unknown>;
  watch: (invalidate: () => void) => () => void;
  canLoad: () => boolean;
}

interface LiveSubscription {
  listeners: Set<() => void>;
  stop: () => void;
}

const cache = new Map<string, LiveEntry<unknown>>();
const subscriptions = new Map<string, LiveSubscription>();

/** Start a query unless this key already has a value, an error, or an in-flight request. */
export function ensureLive(key: string, load: () => Promise<unknown>): void {
  if (cache.has(key)) return;
  let request: Promise<unknown>;
  try {
    request = load();
  } catch (error) {
    cache.set(key, { status: 'error', error });
    return;
  }
  const promise = request.then(
    (data) => {
      if (cache.get(key) === entry) {
        cache.set(key, { status: 'ready', data, fresh: true });
        notify(key);
      }
    },
    (error: unknown) => {
      if (cache.get(key) === entry) {
        cache.set(key, { status: 'error', error });
        notify(key);
      }
      throw error;
    },
  );
  const entry: LiveEntry<unknown> = { status: 'pending', promise };
  cache.set(key, entry);
  // Preloads may finish before anything reads their Suspense promise.
  void promise.catch(() => {});
}

function notify(key: string): void {
  for (const listener of subscriptions.get(key)?.listeners ?? []) listener();
}

/** One subscription lifecycle and serialized refresh loop for every consumer of a key. */
export function subscribeLive(key: string, options: LiveOptions, listener: () => void): () => void {
  let subscription = subscriptions.get(key);
  if (!subscription) {
    let active = true;
    let running = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isActive = (): boolean => active && options.canLoad();
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
        const data = await options.load();
        if (isActive() && !needsRefresh()) writeLive(key, data);
      } catch (error: unknown) {
        // Keep the last usable value; a later event or mount retries.
        if (isActive()) console.error('PocketBase query failed', error);
      } finally {
        running = false;
        if (isActive() && needsRefresh()) schedule();
      }
    };
    function schedule(): void {
      if (!isActive()) return;
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, 100);
    }
    const next: LiveSubscription = { listeners: new Set(), stop: () => {} };
    subscriptions.set(key, next);
    const stopWatching = options.watch(schedule);
    next.stop = () => {
      active = false;
      clearTimeout(timer);
      stopWatching();
    };
    subscription = next;
    // First mount consumes the initial load; subsequent mounts refresh in place.
    if (!consumeFresh(key)) schedule();
  }
  subscription.listeners.add(listener);
  const current = subscription;
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0 && subscriptions.get(key) === current) {
      current.stop();
      subscriptions.delete(key);
    }
  };
}

/** Read a value, suspending for its initial request or throwing its initial error. */
export function readLive(key: string): unknown {
  const entry = cache.get(key);
  if (!entry || entry.status === 'pending') {
    throw entry?.status === 'pending' ? entry.promise : new Error(`No live query for ${key}`);
  }
  if (entry.status === 'error') throw entry.error;
  return entry.data;
}

/** Replace a cached value without suspending and notify every mounted consumer. */
export function writeLive(key: string, data: unknown): void {
  cache.set(key, { status: 'ready', data, fresh: false });
  notify(key);
}

function consumeFresh(key: string): boolean {
  const entry = cache.get(key);
  if (entry?.status !== 'ready' || !entry.fresh) return false;
  entry.fresh = false;
  return true;
}

export function clearLiveErrors(): void {
  for (const [key, entry] of cache) {
    if (entry.status === 'error') cache.delete(key);
  }
}

/** Abandon all loads and subscriptions so another login cannot reuse their results. */
export function clearLiveCache(): void {
  for (const subscription of subscriptions.values()) subscription.stop();
  subscriptions.clear();
  cache.clear();
}
