import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useUndoDelete } from '../hooks/useUndoDelete.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageLayout } from './PageLayout.tsx';
import { DebateCard } from './DebateCard.tsx';

interface DebateDeletePayload {
  id: Id<'debates'>;
  ballotIds: Id<'ballots'>[];
  ballotCount: number;
}

export function AdminDebates(): React.JSX.Element {
  const debates = useQuery(api.debates.listAll);
  const softDeleteDebate = useMutation(api.debates.softDelete);
  const restoreDebate = useMutation(api.debates.restore);

  const { pendingDeletes, softDelete, undo } = useUndoDelete<DebateDeletePayload>(
    (payload) => softDeleteDebate({ debateId: payload.id }),
    (payload) => {
      void restoreDebate({
        debateId: payload.id,
        ballotIds: payload.ballotIds,
      });
    },
  );

  function handleDelete(d: NonNullable<typeof debates>[number]): void {
    void softDelete(d._id, {
      id: d._id,
      ballotIds: d.ballotIds,
      ballotCount: d.ballotCount,
    });
  }

  const pendingList = [...pendingDeletes.values()];
  const isLoading = debates === undefined;

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Debates</h1>
        <button
          className="px-3 py-1.5 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors"
          onClick={() => navigate('admin/new')}
        >
          + New
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {!isLoading && debates.length === 0 && pendingList.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No debates yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {pendingList.map((pd) => (
          <UndoDebateRow key={pd.id} payload={pd} onUndo={() => undo(pd.id)} />
        ))}
        {!isLoading &&
          debates.map((d) => (
            <div key={d._id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <DebateCard debateId={d._id} onClick={() => navigate(`admin/${d._id}`)} />
              </div>
              <button
                className="shrink-0 px-3 py-1.5 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-medium cursor-pointer border-none bg-transparent transition-colors"
                onClick={() => handleDelete(d)}
                aria-label="Delete debate"
              >
                Delete
              </button>
            </div>
          ))}
      </div>
    </PageLayout>
  );
}

function UndoDebateRow({
  payload,
  onUndo,
}: {
  payload: DebateDeletePayload;
  onUndo: () => void;
}): React.JSX.Element {
  const ballotNote =
    payload.ballotCount > 0
      ? ` and ${payload.ballotCount} ballot${payload.ballotCount !== 1 ? 's' : ''}`
      : '';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400">
      <span>Debate{ballotNote} deleted.</span>
      <button
        className="shrink-0 text-nf-blue dark:text-nf-blue-d font-semibold hover:underline cursor-pointer border-none bg-transparent text-sm"
        onClick={onUndo}
      >
        Undo
      </button>
    </div>
  );
}
