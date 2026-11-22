import type { useAdminBallotQuery } from '../../hooks/useAdminBallotQuery.ts';
import type { ResultPage } from '../../data/model.ts';
import { Button } from '../ui/Button.tsx';

export function HistoryControls<T>({
  query,
}: {
  query: ReturnType<typeof useAdminBallotQuery<ResultPage<T>>>;
}): React.JSX.Element {
  const { state } = query;
  return (
    <>
      {state.status === 'loading' && (
        <p role="status" className="py-3 text-sm text-slate-500 dark:text-slate-400">
          Loading history…
        </p>
      )}
      {state.status !== 'loading' && state.error && (
        <div role="alert" className="py-3 text-sm text-red-600 dark:text-red-400">
          <p>{state.error}</p>
          <Button variant="text" onClick={query.retry}>
            Try again
          </Button>
        </div>
      )}
      {state.status === 'ready' && state.data.hasMore && (
        <div className="py-3">
          {query.isLoadingMore ? (
            <span role="status" className="text-sm text-slate-500 dark:text-slate-400">
              Loading more…
            </span>
          ) : (
            <Button variant="link" onClick={query.loadMore}>
              Load more
            </Button>
          )}
        </div>
      )}
    </>
  );
}
