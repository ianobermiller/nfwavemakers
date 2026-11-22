import { createCursorList, type QueryRequest } from './cursorList.ts';

/** Start the first page alongside sibling dashboard queries; the first mount consumes it. */
export function createPreloadedCursorList<T, C>(
  options: Parameters<typeof createCursorList<T, C>>[0],
) {
  const source = createCursorList(options);
  let initial: ReturnType<typeof source.load> | undefined = source.load('refresh');
  void initial.catch(() => {});
  return {
    load: async (request: QueryRequest) => {
      if (initial && request === 'refresh') {
        const pending = initial;
        initial = undefined;
        return await pending;
      }
      return await source.load(request);
    },
  };
}
