import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { AppBar } from './AppBar.tsx';
import { formatTeam } from '../utils.ts';

export function AdminDebates(): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { order: { serverCreatedAt: 'desc' } },
      affTeam: {},
      negTeam: {},
      judges: {},
    },
  });

  const debates = data?.debates ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-12">
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
        {!isLoading && debates.length === 0 && (
          <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
            No debates yet.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {debates.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {d.date}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Room {d.room}</span>
                {d.resolution && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {d.resolution}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-aff dark:text-aff-d font-semibold">
                    {formatTeam(d.affTeam ?? [])}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 mx-1">vs</span>
                  <span className="text-neg dark:text-neg-d font-semibold">
                    {formatTeam(d.negTeam ?? [])}
                  </span>
                </span>
              </div>
              <button
                className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600 transition-colors"
                onClick={() => navigate(`admin/${d.id}`)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
