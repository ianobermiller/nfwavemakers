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

function efficientFixture(count: number) {
  const items = Array.from({ length: count }, (_, index) => ({ id: index + 1 }));
  const requests: CursorRange<number>[] = [];
  const probes: number[] = [];
  let failProbe = false;
  const source = createCursorList({
    key: (item: { id: number }) => String(item.id),
    load: (range: CursorRange<number>) => {
      requests.push(range);
      const matching = items.filter(
        (item) =>
          item.id > (range.after ?? 0) && (range.through === null || item.id <= range.through),
      );
      const page = matching.slice(0, range.pageSize ?? 20);
      return Promise.resolve({
        items: page,
        cursor: page.at(-1)?.id ?? null,
        hasMore: matching.length > page.length,
      });
    },
    refresh: {
      pageSize: 100,
      hasAfter: (cursor) => {
        probes.push(cursor);
        return failProbe
          ? Promise.reject(new Error('Probe unavailable'))
          : Promise.resolve(items.some((item) => item.id > cursor));
      },
    },
  });
  return {
    items,
    requests,
    probes,
    source,
    failProbe: () => {
      failProbe = true;
    },
  };
}

void test('efficient refresh retains 80 rows with one bounded range and one existence probe', async () => {
  const { items, requests, probes, source } = efficientFixture(85);
  await source.load('refresh');
  for (let page = 0; page < 3; page += 1) await source.load('more');
  assert.ok(requests.every((range) => range.pageSize === undefined));
  requests.length = 0;
  assert.deepEqual(await source.load('refresh'), { items: items.slice(0, 80), hasMore: true });
  assert.deepEqual(requests, [{ after: null, through: 80, pageSize: 100 }]);
  assert.deepEqual(probes, [80]);
});

void test('large retained ranges continue through bounded keyset requests', async () => {
  const { items, requests, probes, source } = efficientFixture(245);
  await source.load('refresh');
  for (let page = 0; page < 11; page += 1) await source.load('more');
  requests.length = 0;
  assert.deepEqual(await source.load('refresh'), { items: items.slice(0, 240), hasMore: true });
  assert.deepEqual(requests, [
    { after: null, through: 240, pageSize: 100 },
    { after: 100, through: 240, pageSize: 100 },
    { after: 200, through: 240, pageSize: 100 },
  ]);
  assert.deepEqual(probes, [240]);
});

void test('a failed existence probe does not replace the cursor or loaded rows', async () => {
  const fixture = efficientFixture(85);
  await fixture.source.load('refresh');
  for (let page = 0; page < 3; page += 1) await fixture.source.load('more');
  fixture.failProbe();
  await assert.rejects(fixture.source.load('refresh'), /Probe unavailable/);
  assert.deepEqual(await fixture.source.load('more'), { items: fixture.items, hasMore: false });
  assert.deepEqual(fixture.requests.at(-1), { after: 80, through: null });
});
