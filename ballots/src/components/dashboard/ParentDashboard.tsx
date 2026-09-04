import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { navigate } from '../../hooks/useHashRoute.ts';
import { DebateCard } from '../DebateCard.tsx';

export function ParentDashboard({ userId }: { userId: Id<'users'> }): React.JSX.Element {
  const debates = useQuery(api.debates.listAssigned);
  const submittedBallots = useQuery(api.ballots.submittedByMe);
  const isLoading = debates === undefined || submittedBallots === undefined;

  const hasAssigned = !isLoading && debates.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {!hasAssigned && (
        <button
          className="w-full py-4 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-bold text-lg rounded-xl cursor-pointer transition-colors"
          onClick={() => navigate('judge')}
        >
          Judge a Round
        </button>
      )}

      {hasAssigned && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Assigned Debates
          </h2>
          <div className="flex flex-col gap-3">
            {debates.map((d) => (
              <DebateCard key={d._id} debateId={d._id} onClick={() => navigate(`judge/${d._id}`)} />
            ))}
          </div>
        </section>
      )}

      {hasAssigned && (
        <button
          className="w-full py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
          onClick={() => navigate('judge')}
        >
          New Round
        </button>
      )}

      {!isLoading && submittedBallots.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Submitted Ballots
          </h2>
          <div className="flex flex-col gap-3">
            {submittedBallots.map((b) => {
              if (b.debate) {
                return (
                  <DebateCard
                    key={b._id}
                    debateId={b.debate._id}
                    judgeId={userId}
                    onClick={() => navigate(`ballot/${b._id}`)}
                  />
                );
              }
              const displayDate =
                b.submittedAt != null ? new Date(b.submittedAt).toLocaleDateString() : '—';
              const winnerText =
                b.winner === 'aff'
                  ? 'Affirmative wins'
                  : b.winner === 'neg'
                    ? 'Negative wins'
                    : '—';
              return (
                <button
                  key={b._id}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
                  onClick={() => navigate(`ballot/${b._id}`)}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {displayDate}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{winnerText}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
