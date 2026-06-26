import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageLayout } from './PageLayout.tsx';
import { DebateCard } from './DebateCard.tsx';

export function AdminDebates(): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { order: { serverCreatedAt: 'desc' } },
      judges: {},
    },
  });

  const debates = data?.debates ?? [];

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
      {!isLoading && debates.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No debates yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {debates.map((d) => (
          <DebateCard key={d.id} debateId={d.id} onClick={() => navigate(`admin/${d.id}`)} />
        ))}
      </div>
    </PageLayout>
  );
}
