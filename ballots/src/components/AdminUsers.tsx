import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { PageLayout } from './PageLayout.tsx';
import { Avatar } from './Avatar.tsx';

export function AdminUsers(): React.JSX.Element {
  const users = useQuery(api.users.list);
  const isLoading = users === undefined;

  return (
    <PageLayout>
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Manage Users</h1>
      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {!isLoading && users.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No users yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {(users ?? []).map((u) => (
          <div
            key={u._id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <Avatar
              name={u.name ?? u.email ?? u._id}
              imageURL={u.avatarUrl ?? undefined}
              size="sm"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {u.name ?? 'Unnamed'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {u.email ?? 'no email'}
              </span>
            </div>
            {u.role && (
              <span className="ml-auto shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {u.role}
              </span>
            )}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
