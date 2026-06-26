import { db } from '../../db.ts';
import { navigate } from '../../hooks/useHashRoute.ts';

export function ParentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { where: { 'judges.id': userId } },
    },
    ballots: {
      $: { where: { 'judge.id': userId } },
      debate: {},
    },
  });

  const debates = data?.debates ?? [];
  const submittedBallots = (data?.ballots ?? []).filter((b) => b.submittedAt != null);

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
              <button
                key={d.id}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
                onClick={() => navigate(`judge/${d.id}`)}
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {d.date}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Room {d.room}</span>
                {d.resolution && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {d.resolution}
                  </span>
                )}
              </button>
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
              const displayDate =
                b.debate?.date ??
                (b.submittedAt != null ? new Date(b.submittedAt).toLocaleDateString() : '—');
              return (
                <button
                  key={b.id}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
                  onClick={() => navigate(`ballot/${b.id}`)}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {displayDate}
                  </span>
                  {b.debate?.room && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Room {b.debate.room}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {b.winner === 'aff'
                      ? 'Affirmative wins'
                      : b.winner === 'neg'
                        ? 'Negative wins'
                        : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
