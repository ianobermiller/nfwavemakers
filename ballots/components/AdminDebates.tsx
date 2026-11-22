import { useState } from 'react';
import {
  listActiveBallotIdsForDebate,
  listAdminDebates,
  ADMIN_SUMMARY_REFRESH_PAGE_SIZE,
  hasAdminDebatesAfter,
  restoreDebate,
  softDeleteDebate,
} from '../data/api.ts';
import { useAdminBallotQuery } from '../hooks/useAdminBallotQuery.ts';
import { createCursorList } from '../lib/cursorList.ts';
import { useUndoDelete } from '../hooks/useUndoDelete.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { AdminDebateItem, type DebateDeletePayload, UndoDebateRow } from './AdminDebateItem.tsx';
import { Button } from './ui/Button.tsx';

export function AdminDebates(): React.JSX.Element {
  const [source] = useState(() =>
    createCursorList({
      load: listAdminDebates,
      key: (row) => row.id,
      refresh: { pageSize: ADMIN_SUMMARY_REFRESH_PAGE_SIZE, hasAfter: hasAdminDebatesAfter },
    }),
  );
  const query = useAdminBallotQuery(source.load, (collection, record, data) => {
    if (collection === 'debates' || collection === 'ballots') return true;
    return (
      collection === 'users' &&
      data?.items.some((debate) =>
        [...debate.affTeam, ...debate.negTeam, ...debate.judges].some(
          (user) => user.id === record.id,
        ),
      ) === true
    );
  });
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<string | undefined>();
  const { pendingDeletes, softDelete, undo } = useUndoDelete<DebateDeletePayload>(
    (payload) => softDeleteDebate(payload.id, payload.ballotIds),
    (payload) => {
      void restoreDebate(payload.id, payload.ballotIds).catch((error: unknown) =>
        setDeleteError(errorMessage(error, 'Couldn’t restore debate.')),
      );
    },
  );
  const debates = query.state.status === 'ready' ? query.state.data.items : [];

  async function handleDelete(id: string): Promise<void> {
    if (deleting) return;
    setDeleting(id);
    setDeleteError(undefined);
    try {
      const ballotIds = await listActiveBallotIdsForDebate(id);
      await softDelete(id, { id, ballotIds, ballotCount: ballotIds.length });
    } catch (error: unknown) {
      setDeleteError(errorMessage(error, 'Couldn’t delete debate.'));
    } finally {
      setDeleting(undefined);
    }
  }

  const pendingList = [...pendingDeletes.values()];
  return (
    <PageLayout title="Manage Debates">
      <BackLink to="dashboard" label="Dashboard" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Debates</h1>
        <Button size="sm" className="h-11 sm:h-9" onClick={() => navigate('admin/new')}>
          + New
        </Button>
      </div>
      {query.state.status === 'loading' && (
        <p role="status" className="py-4 text-sm text-slate-500 dark:text-slate-400">
          Loading debates…
        </p>
      )}
      {query.state.status !== 'loading' && query.state.error && (
        <div role="alert" className="my-3 text-sm text-red-600 dark:text-red-400">
          <p>{query.state.error}</p>
          <Button variant="text" onClick={query.retry}>
            Try again
          </Button>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="my-3 text-sm text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      )}
      {deleting && (
        <p role="status" className="my-3 text-sm text-slate-500 dark:text-slate-400">
          Deleting debate…
        </p>
      )}
      {query.state.status === 'ready' && debates.length === 0 && pendingList.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No debates yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {pendingList.map((pd) => (
          <UndoDebateRow key={pd.id} payload={pd} onUndo={() => undo(pd.id)} />
        ))}
        {debates
          .filter((d) => !pendingDeletes.has(d.id))
          .map((d) => (
            <AdminDebateItem
              key={d.id}
              debateId={d.id}
              debate={d}
              ballotCount={d.ballotCount}
              onDelete={() => void handleDelete(d.id)}
            />
          ))}
      </div>
      {query.state.status === 'ready' && query.state.data.hasMore && (
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
    </PageLayout>
  );
}
