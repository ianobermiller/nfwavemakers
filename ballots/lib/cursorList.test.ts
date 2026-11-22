import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCursorList } from './cursorList.ts';
import type { CursorPage, CursorRange } from '../data/model.ts';

void test('a superseded request cannot replace the cursor used to load more', async () => {
  let release = (_page: CursorPage<{ id: string }, string>): void => {};
  const pending = new Promise<CursorPage<{ id: string }, string>>((resolve) => {
    release = resolve;
  });
  const requests: CursorRange<string>[] = [];
  const source = createCursorList({
    key: (item: { id: string }) => item.id,
    load: (range: CursorRange<string>) => {
      requests.push(range);
      if (requests.length === 1) return pending;
      if (requests.length === 2)
        return Promise.resolve({ items: [{ id: 'latest' }], cursor: 'latest', hasMore: true });
      return Promise.resolve({ items: [{ id: 'older' }], cursor: 'older', hasMore: false });
    },
  });
  const obsolete = source.load('refresh');
  await source.load('refresh');
  release({ items: [{ id: 'obsolete' }], cursor: 'obsolete', hasMore: true });
  await obsolete;
  assert.deepEqual(await source.load('more'), {
    items: [{ id: 'latest' }, { id: 'older' }],
    hasMore: false,
  });
  assert.deepEqual(requests.at(-1), { after: 'latest', through: null });
});

void test('a failed append retries from the same cursor and preserves loaded rows', async () => {
  const requests: CursorRange<string>[] = [];
  const source = createCursorList({
    key: (item: { id: string }) => item.id,
    load: (range: CursorRange<string>) => {
      requests.push(range);
      if (requests.length === 1)
        return Promise.resolve({ items: [{ id: 'first' }], cursor: 'first', hasMore: true });
      if (requests.length === 2) return Promise.reject(new Error('Network unavailable'));
      return Promise.resolve({ items: [{ id: 'second' }], cursor: 'second', hasMore: false });
    },
  });
  await source.load('refresh');
  await assert.rejects(source.load('more'), /Network unavailable/);
  assert.deepEqual(await source.load('more'), {
    items: [{ id: 'first' }, { id: 'second' }],
    hasMore: false,
  });
  assert.deepEqual(requests.slice(1), [
    { after: 'first', through: null },
    { after: 'first', through: null },
  ]);
});
