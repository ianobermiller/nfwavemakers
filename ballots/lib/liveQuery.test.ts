import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearLiveCache,
  clearLiveErrors,
  ensureLive,
  readLive,
  writeLive,
  subscribeLive,
} from './liveQuery.ts';

void test('readLive suspends until the query resolves, then returns the value', async () => {
  let resolve: (value: string) => void = () => {};
  const key = 'test-resolve';
  ensureLive(
    key,
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  ensureLive(key, () => Promise.resolve('ignored'));

  try {
    readLive(key);
    assert.fail('expected the pending query to throw');
  } catch (thrown) {
    assert.ok(thrown instanceof Promise);
  }

  resolve('ready');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(readLive(key), 'ready');
});

void test('a failed query suspends once, then throws the cached error', async () => {
  const key = 'test-error';
  ensureLive(key, () => Promise.reject(new Error('nope')));

  try {
    readLive(key);
    assert.fail('expected the pending query to throw');
  } catch (thrown) {
    assert.ok(thrown instanceof Promise);
    await thrown.catch(() => {});
  }

  assert.throws(() => readLive(key), /nope/);
  clearLiveErrors();
  ensureLive(key, () => Promise.resolve('recovered'));
  try {
    readLive(key);
  } catch (thrown) {
    assert.ok(thrown instanceof Promise);
    await thrown;
  }
  assert.equal(readLive(key), 'recovered');
});

void test('writeLive updates a cached query without suspending', async () => {
  const key = 'test-write';
  ensureLive(key, () => Promise.resolve('first'));
  try {
    readLive(key);
  } catch (thrown) {
    assert.ok(thrown instanceof Promise);
    await thrown;
  }
  writeLive(key, 'second');
  assert.equal(readLive(key), 'second');
});

void test('clearLiveCache drops ready queries and abandons in-flight ones', async () => {
  let resolve: (value: string) => void = () => {};
  const pendingKey = 'test-clear-pending';
  const readyKey = 'test-clear-ready';
  ensureLive(readyKey, () => Promise.resolve('ready'));
  try {
    readLive(readyKey);
  } catch (thrown) {
    assert.ok(thrown instanceof Promise);
    await thrown;
  }
  ensureLive(
    pendingKey,
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  clearLiveCache();
  assert.throws(() => readLive(readyKey), /No live query/);
  resolve('late');
  await Promise.resolve();
  await Promise.resolve();
  assert.throws(() => readLive(pendingKey), /No live query/);
});

void test('cleared initial requests cannot overwrite a new request under the same key', async () => {
  clearLiveCache();
  let resolveOld: (value: string) => void = () => {};
  let resolveNew: (value: string) => void = () => {};
  ensureLive(
    'same-key',
    () =>
      new Promise<string>((done) => {
        resolveOld = done;
      }),
  );
  clearLiveCache();
  ensureLive(
    'same-key',
    () =>
      new Promise<string>((done) => {
        resolveNew = done;
      }),
  );
  resolveOld('old login');
  await Promise.resolve();
  assert.throws(
    () => readLive('same-key'),
    (thrown) => thrown instanceof Promise,
  );
  resolveNew('new login');
  await Promise.resolve();
  assert.equal(readLive('same-key'), 'new login');
});

function events() {
  const callbacks = new Set<() => void>();
  let starts = 0;
  let stops = 0;
  return {
    watch: (invalidate: () => void) => {
      starts++;
      callbacks.add(invalidate);
      return () => {
        stops++;
        callbacks.delete(invalidate);
      };
    },
    emit: () => {
      for (const callback of callbacks) callback();
    },
    starts: () => starts,
    stops: () => stops,
  };
}

async function seed(key: string): Promise<void> {
  clearLiveCache();
  ensureLive(key, () => Promise.resolve('initial'));
  await Promise.resolve();
}

void test('consumers share subscriptions, burst refreshes, and notifications until the last unmount', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await seed('shared');
  const source = events();
  let calls = 0;
  let firstUpdates = 0;
  let secondUpdates = 0;
  const options = {
    load: async () => {
      calls++;
      return 'updated';
    },
    watch: source.watch,
    canLoad: () => true,
  };
  const stopFirst = subscribeLive('shared', options, () => {
    firstUpdates++;
  });
  const stopSecond = subscribeLive('shared', options, () => {
    secondUpdates++;
  });
  assert.equal(source.starts(), 1);
  assert.equal(calls, 0);
  for (let i = 0; i < 5; i++) source.emit();
  t.mock.timers.tick(100);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(firstUpdates, 1);
  assert.equal(secondUpdates, 1);
  stopFirst();
  assert.equal(source.stops(), 0);
  source.emit();
  t.mock.timers.tick(100);
  await Promise.resolve();
  assert.equal(firstUpdates, 1);
  assert.equal(secondUpdates, 2);
  stopSecond();
  assert.equal(source.stops(), 1);
});

void test('events during a refresh cause one serialized follow-up without publishing the invalidated result', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await seed('serialized');
  const source = events();
  const resolvers: ((value: string) => void)[] = [];
  const stop = subscribeLive(
    'serialized',
    {
      load: () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
      watch: source.watch,
      canLoad: () => true,
    },
    () => {},
  );
  source.emit();
  t.mock.timers.tick(100);
  assert.equal(resolvers.length, 1);
  for (let i = 0; i < 5; i++) source.emit();
  t.mock.timers.tick(100);
  assert.equal(resolvers.length, 1);
  resolvers[0]?.('invalidated');
  await Promise.resolve();
  assert.equal(readLive('serialized'), 'initial');
  t.mock.timers.tick(100);
  assert.equal(resolvers.length, 2);
  resolvers[1]?.('latest');
  await Promise.resolve();
  assert.equal(readLive('serialized'), 'latest');
  stop();
});

void test('a background failure retains data and the next event retries', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(console, 'error', () => {});
  await seed('retry-refresh');
  const source = events();
  let fail = true;
  const stop = subscribeLive(
    'retry-refresh',
    {
      load: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve('recovered')),
      watch: source.watch,
      canLoad: () => true,
    },
    () => {},
  );
  source.emit();
  t.mock.timers.tick(100);
  await Promise.resolve();
  assert.equal(readLive('retry-refresh'), 'initial');
  fail = false;
  source.emit();
  t.mock.timers.tick(100);
  await Promise.resolve();
  assert.equal(readLive('retry-refresh'), 'recovered');
  stop();
});

void test('cache clearing stops watchers and discards an old background request after same-key login', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await seed('old-background');
  const source = events();
  let resolveOld: (value: string) => void = () => {};
  subscribeLive(
    'old-background',
    {
      load: () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve;
        }),
      watch: source.watch,
      canLoad: () => true,
    },
    () => {},
  );
  source.emit();
  t.mock.timers.tick(100);
  clearLiveCache();
  assert.equal(source.stops(), 1);
  ensureLive('old-background', () => Promise.resolve('new login'));
  await Promise.resolve();
  resolveOld('old data');
  await Promise.resolve();
  assert.equal(readLive('old-background'), 'new login');
});

void test('a changed auth identity blocks scheduled loads and pending results', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await seed('auth-guard');
  const source = events();
  let allowed = true;
  let calls = 0;
  let resolve: (value: string) => void = () => {};
  const stop = subscribeLive(
    'auth-guard',
    {
      load: () => {
        calls++;
        return new Promise<string>((done) => {
          resolve = done;
        });
      },
      watch: source.watch,
      canLoad: () => allowed,
    },
    () => {},
  );
  source.emit();
  allowed = false;
  t.mock.timers.tick(100);
  assert.equal(calls, 0);
  allowed = true;
  source.emit();
  t.mock.timers.tick(100);
  allowed = false;
  resolve('different user');
  await Promise.resolve();
  assert.equal(readLive('auth-guard'), 'initial');
  stop();
});

void test('remounting cached data revalidates once for concurrent consumers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await seed('remount');
  const source = events();
  let calls = 0;
  const options = {
    load: async () => {
      calls++;
      return 'refreshed';
    },
    watch: source.watch,
    canLoad: () => true,
  };
  subscribeLive('remount', options, () => {})();
  const stopFirst = subscribeLive('remount', options, () => {});
  const stopSecond = subscribeLive('remount', options, () => {});
  t.mock.timers.tick(100);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(readLive('remount'), 'refreshed');
  stopFirst();
  stopSecond();
});
