type LiveEntry<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'ready'; data: T; fresh: boolean }
  | { status: 'error'; error: unknown };

const cache = new Map<string, LiveEntry<unknown>>();

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
      const current = cache.get(key);
      if (current?.status === 'pending') {
        cache.set(key, { status: 'ready', data, fresh: true });
      }
    },
    (error: unknown) => {
      const current = cache.get(key);
      if (current?.status === 'pending') {
        cache.set(key, { status: 'error', error });
      }
      throw error;
    },
  );

  cache.set(key, { status: 'pending', promise });
}

/**
 * Return the cached value. Throws the in-flight promise while loading, or the
 * cached error after a failed load, so a Suspense boundary can wait.
 */
export function readLive(key: string): unknown {
  const entry = cache.get(key);
  if (!entry || entry.status === 'pending') {
    throw entry?.status === 'pending' ? entry.promise : new Error(`No live query for ${key}`);
  }
  if (entry.status === 'error') throw entry.error;
  return entry.data;
}

/** Replace a cached value without suspending. Used for PocketBase subscription updates. */
export function writeLive(key: string, data: unknown): void {
  cache.set(key, { status: 'ready', data, fresh: false });
}

/**
 * The fetch that just filled the cache is current. Returns true once so the
 * subscriber can skip an immediate refetch, then later mounts refresh.
 */
export function consumeFresh(key: string): boolean {
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

/** Drop every cached query so a new login cannot reuse stale or empty results. */
export function clearLiveCache(): void {
  cache.clear();
}
