import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { navigate } from '../../hooks/useHashRoute.ts';

export function StudentDashboard({ userId: _userId }: { userId: string }): React.JSX.Element {
  const ballots = useQuery(api.ballots.forSpeaker);
  const isLoading = ballots === undefined;

  const byGroup = new Map<string, NonNullable<typeof ballots>>();
  for (const b of ballots ?? []) {
    const key = b.debate?._id ?? b._id;
    const arr = byGroup.get(key) ?? [];
    arr.push(b);
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
          const ballot = evs[0];
          const debate = ballot?.debate;
          const displayDate =
            debate?.date ??
            (ballot?.submittedAt != null ? new Date(ballot.submittedAt).toLocaleDateString() : '—');
          const viewRoute = debate?._id ? `debate/${debate._id}` : `ballot/${ballot?._id}`;
          const judgeNames = [
            ...new Set(
              evs.map((ev) => ev.judge?.name).filter((name): name is string => name != null),
            ),
          ];
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
                    · {debate.room}
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
