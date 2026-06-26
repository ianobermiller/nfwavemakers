import { db } from '../../db.ts';
import { navigate } from '../../hooks/useHashRoute.ts';

export function StudentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    speakerEvals: {
      $: { where: { 'speaker.id': userId } },
      ballot: {
        debate: {},
        judge: {},
      },
    },
  });

  const evals = (data?.speakerEvals ?? []).filter((e) => e.ballot?.submittedAt != null);

  // Group by debateId when available, fall back to ballotId so standalone ballots still appear.
  const byGroup = new Map<string, typeof evals>();
  for (const e of evals) {
    const key = e.ballot?.debate?.id ?? e.ballot?.id;
    if (!key) continue;
    const arr = byGroup.get(key) ?? [];
    arr.push(e);
    byGroup.set(key, arr);
  }

  return (
    <div>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">My Feedback</h2>
      {isLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>}
      {!isLoading && byGroup.size === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No submitted ballots yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {[...byGroup.entries()].map(([groupKey, evs]) => {
          const ballot = evs[0]?.ballot;
          const debate = ballot?.debate;
          const displayDate =
            debate?.date ??
            (ballot?.submittedAt != null ? new Date(ballot.submittedAt).toLocaleDateString() : '—');
          const viewRoute = debate?.id ? `debate/${debate.id}` : `ballot/${ballot?.id}`;
          const judgeNames = [...new Set(evs.map((ev) => ev.ballot?.judge?.name).filter(Boolean))];
          return (
            <button
              key={groupKey}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
              onClick={() => navigate(viewRoute)}
            >
              <strong className="text-sm text-slate-800 dark:text-slate-100">
                {displayDate}
                {debate?.room && (
                  <span className="font-normal text-slate-500 dark:text-slate-400 ml-2">
                    · Room {debate.room}
                  </span>
                )}
              </strong>
              {judgeNames.map((name) => (
                <span key={name} className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Judge: {name}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
