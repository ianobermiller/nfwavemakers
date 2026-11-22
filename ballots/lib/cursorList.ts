import type { CursorPage, CursorRange, ResultPage } from '../data/model.ts';

export type QueryRequest = 'refresh' | 'more';

/** Requests are serialized by useAdminBallotQuery; publish only complete ranges. */
export function createCursorList<T, C>({
  load,
  key,
  refresh,
}: {
  load: (range: CursorRange<C>) => Promise<CursorPage<T, C>>;
  key: (item: T) => string;
  refresh?: { pageSize: number; hasAfter: (cursor: C) => Promise<boolean> };
}) {
  let current: CursorPage<T, C> | undefined;
  let revision = 0;
  const unique = (items: T[]): T[] => [...new Map(items.map((item) => [key(item), item])).values()];

  return {
    load: async (request: QueryRequest): Promise<ResultPage<T>> => {
      const requestRevision = ++revision;
      const previous = current;
      let nextState: CursorPage<T, C>;
      if (!previous || previous.cursor === null) {
        nextState = await load({ after: null, through: null });
      } else if (request === 'more') {
        if (!previous.hasMore) return { items: previous.items, hasMore: false };
        const next = await load({ after: previous.cursor, through: null });
        const moved = new Set(next.items.map(key));
        nextState = {
          items: [...previous.items.filter((item) => !moved.has(key(item))), ...next.items],
          cursor: next.cursor ?? previous.cursor,
          hasMore: next.hasMore,
        };
      } else {
        const items: T[] = [];
        let after: C | null = null;
        let more = true;
        while (more) {
          const page = await load({
            after,
            through: previous.cursor,
            ...(refresh ? { pageSize: refresh.pageSize } : {}),
          });
          items.push(...page.items);
          after = page.cursor;
          more = page.hasMore && page.cursor !== null;
        }
        // Probe beyond the saved boundary so inserts into older history expose Load more.
        const hasMore = refresh
          ? await refresh.hasAfter(previous.cursor)
          : (await load({ after: previous.cursor, through: null })).items.length > 0;
        nextState = {
          items: unique(items),
          cursor: previous.cursor,
          hasMore,
        };
      }
      if (requestRevision === revision) current = nextState;
      return { items: nextState.items, hasMore: nextState.hasMore };
    },
  };
}
