import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearLiveCache, clearLiveErrors, ensureLive, readLive, writeLive } from './liveQuery.ts';

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
