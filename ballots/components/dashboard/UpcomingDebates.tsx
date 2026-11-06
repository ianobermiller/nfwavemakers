import type { Role } from '../../types.ts';
import { listActiveBallotIdsForDebate, restoreDebate, softDeleteDebate } from '../../data/api.ts';
import { useUpcomingDebates } from '../../hooks/data.ts';
import { useUndoDelete } from '../../hooks/useUndoDelete.ts';
import { formatLocalYmd } from '../../lib/dates.ts';
import { AdminDebateItem, type DebateDeletePayload, UndoDebateRow } from '../AdminDebateItem.tsx';
import { DebateCard } from '../DebateCard.tsx';
import { Heading } from '../ui/Heading.tsx';

export function UpcomingDebates({ role }: { role: Role }): React.JSX.Element {
  // Local calendar day so debates dated today stay visible after UTC midnight.
  const today = formatLocalYmd(new Date());
  const upcoming = useUpcomingDebates(today).read();
  const isAdmin = role === 'admin';

  const { pendingDeletes, softDelete, undo } = useUndoDelete<DebateDeletePayload>(
    (payload) => softDeleteDebate(payload.id),
    (payload) => {
      void restoreDebate(payload.id, payload.ballotIds);
    },
  );

  const pendingList = [...pendingDeletes.values()];
  const visible = upcoming.filter((d) => !pendingDeletes.has(d.id));

  async function handleDelete(debateId: string): Promise<void> {
    const ballotIds = await listActiveBallotIdsForDebate(debateId);
    await softDelete(debateId, {
      id: debateId,
      ballotIds,
      ballotCount: ballotIds.length,
    });
  }

  if (visible.length === 0 && pendingList.length === 0) return <></>;

  return (
    <section>
      <Heading>Upcoming Debates</Heading>
      <div className="flex flex-col gap-3">
        {pendingList.map((pd) => (
          <UndoDebateRow key={pd.id} payload={pd} onUndo={() => undo(pd.id)} />
        ))}
        {visible.map((d) =>
          isAdmin ? (
            <AdminDebateItem
              key={d.id}
              debateId={d.id}
              debate={d}
              onDelete={() => void handleDelete(d.id)}
            />
          ) : (
            <DebateCard key={d.id} debateId={d.id} debate={d} />
          ),
        )}
      </div>
    </section>
  );
}
