import { navigate } from '../../hooks/useHashRoute.ts';

export function AdminDashboard(): React.JSX.Element {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-left cursor-pointer hover:border-nf-accent hover:shadow-md transition-all"
          onClick={() => navigate('admin')}
        >
          <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
            Manage Debates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create and edit debates, assign students and judges.
          </p>
        </button>
        <button
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-left cursor-pointer hover:border-nf-accent hover:shadow-md transition-all"
          onClick={() => navigate('admin-ballots')}
        >
          <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
            All Ballots
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse submitted ballots by debate or by student.
          </p>
        </button>
      </div>
    </div>
  );
}
