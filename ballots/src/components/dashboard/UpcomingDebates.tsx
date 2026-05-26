import { db } from '../../db.ts';
import { formatTeam } from '../../utils.ts';

export function UpcomingDebates(): React.JSX.Element {
  const today = new Date().toISOString().slice(0, 10);
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { where: { date: { $gte: today } }, order: { serverCreatedAt: 'asc' } },
      affTeam: {},
      negTeam: {},
      judges: {},
    },
  });

  const upcoming = data?.debates ?? [];

  if (isLoading || upcoming.length === 0) return <></>;

  return (
    <section>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
        Upcoming Debates
      </h2>
      <div className="flex flex-col gap-3">
        {upcoming.map((d) => {
          const affStr = formatTeam(d.affTeam ?? []);
          const negStr = formatTeam(d.negTeam ?? []);
          const judgeNames = (d.judges ?? []).map((u) => u.name ?? '?');
          return (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {d.date}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Room {d.room}</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                <span className="text-aff dark:text-aff-d font-semibold">{affStr}</span>
                <span className="text-slate-400 dark:text-slate-500 mx-1">vs</span>
                <span className="text-neg dark:text-neg-d font-semibold">{negStr}</span>
              </span>
              {judgeNames.length > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Judge: {judgeNames.join(', ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
