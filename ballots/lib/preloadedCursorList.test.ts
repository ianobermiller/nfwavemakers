import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreloadedCursorList } from './preloadedCursorList.ts';
import type { CursorRange } from '../data/model.ts';

void test('preloaded history starts immediately and first mount consumes the same page', async () => {
  const requests: CursorRange<string>[] = [];
  const source = createPreloadedCursorList({
    key: (item: { id: string }) => item.id,
    load: async (range: CursorRange<string>) => {
      requests.push(range);
      return { items: [{ id: 'first' }], cursor: 'first', hasMore: true };
    },
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(await source.load('refresh'), { items: [{ id: 'first' }], hasMore: true });
  assert.equal(requests.length, 1);
  await source.load('more');
  assert.deepEqual(requests.at(-1), { after: 'first', through: null });
});

void test('a rejected preload can be retried after its first consumer sees the error', async () => {
  let calls = 0;
  const source = createPreloadedCursorList({
    key: (item: { id: string }) => item.id,
    load: async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return { items: [{ id: 'recovered' }], cursor: 'recovered', hasMore: false };
    },
  });
  await assert.rejects(source.load('refresh'), /offline/);
  assert.deepEqual(await source.load('refresh'), { items: [{ id: 'recovered' }], hasMore: false });
  assert.equal(calls, 2);
});
