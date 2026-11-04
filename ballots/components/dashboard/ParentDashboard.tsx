import { useAssignedDebates, useSubmittedBallots } from '../../hooks/data.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { DebateCard } from '../DebateCard.tsx';

export function ParentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const debatesLive = useAssignedDebates();
  const submittedLive = useSubmittedBallots();
  const debates = debatesLive.read();
  const submittedBallots = submittedLive.read();
  const submittedDebateIds = new Set(
    submittedBallots.flatMap((ballot) => (ballot.debate ? [ballot.debate.id] : [])),
  );
  const openDebates = debates.filter((debate) => !submittedDebateIds.has(debate.id));
  const hasOpenAssigned = openDebates.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {hasOpenAssigned && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Your Debates
          </h2>
          <div className="flex flex-col gap-3">
            {openDebates.map((d) => (
              <DebateCard
                key={d.id}
                debateId={d.id}
                debate={d}
                onClick={() => navigate(`judge/${d.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {debates.length === 0 && (
        <p className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
          No debates assigned yet. A club admin sets up each round before you can judge it.
        </p>
      )}

      {submittedBallots.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Submitted Ballots
          </h2>
          <div className="flex flex-col gap-3">
            {submittedBallots.map((b) => {
              if (b.debate) {
                return (
                  <DebateCard
                    key={b.id}
                    debateId={b.debate.id}
                    debate={b.debate}
                    judgeId={userId}
                    winner={b.winner}
                    onClick={() => navigate(`ballot/${b.id}`)}
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
                  key={b.id}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
                  onClick={() => navigate(`ballot/${b.id}`)}
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
