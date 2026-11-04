import { restoreDebate, softDeleteDebate } from '../data/api.ts';
import { useAdminDebates } from '../hooks/data.ts';
import { useUndoDelete } from '../hooks/useUndoDelete.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { AdminDebateItem, type DebateDeletePayload, UndoDebateRow } from './AdminDebateItem.tsx';

export function AdminDebates(): React.JSX.Element {
  const debatesLive = useAdminDebates();

  const { pendingDeletes, softDelete, undo } = useUndoDelete<DebateDeletePayload>(
    (payload) => softDeleteDebate(payload.id),
    (payload) => {
      void restoreDebate(payload.id, payload.ballotIds);
    },
  );

  const debates = debatesLive.read();

  function handleDelete(d: (typeof debates)[number]): void {
    void softDelete(d.id, {
      id: d.id,
      ballotIds: d.ballotIds,
      ballotCount: d.ballotCount,
    });
  }

  const pendingList = [...pendingDeletes.values()];

  return (
    <PageLayout>
      <BackLink to="dashboard" label="Dashboard" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Debates</h1>
        <button
          className="inline-flex h-11 items-center px-4 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors sm:h-9 sm:px-3"
          onClick={() => navigate('admin/new')}
          type="button"
        >
          + New
        </button>
      </div>
      {debates.length === 0 && pendingList.length === 0 && (
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
              onDelete={() => handleDelete(d)}
            />
          ))}
      </div>
    </PageLayout>
  );
}
