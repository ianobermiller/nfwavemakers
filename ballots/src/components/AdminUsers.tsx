import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAppUser } from '../hooks/auth.tsx';
import { PageLayout } from './PageLayout.tsx';
import { Avatar } from './Avatar.tsx';

export function AdminUsers(): React.JSX.Element {
  const [showArchived, setShowArchived] = useState(false);
  const me = useAppUser();
  const users = useQuery(api.users.list, { includeArchived: showArchived });
  const setArchived = useMutation(api.users.setArchived);
  const isLoading = users === undefined;
  const [pendingId, setPendingId] = useState<Id<'users'> | null>(null);
  const [error, setError] = useState('');

  async function toggleArchived(userId: Id<'users'>, archived: boolean): Promise<void> {
    setPendingId(userId);
    setError('');
    try {
      await setArchived({ userId, archived });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <PageLayout>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Users</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
          <input
            checked={showArchived}
            className="accent-nf-blue"
            onChange={(e) => setShowArchived(e.target.checked)}
            type="checkbox"
          />
          Show archived
        </label>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {!isLoading && users.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          {showArchived ? 'No users yet.' : 'No active users.'}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {(users ?? []).map((u) => {
          const isMe = me?._id === u._id;
          const busy = pendingId === u._id;
          return (
            <div
              key={u._id}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 ${
                u.archived ? 'opacity-70' : ''
              }`}
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
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {u.archived && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                    archived
                  </span>
                )}
                {u.role && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {u.role}
                  </span>
                )}
                {!isMe && (
                  <UserRowMenu
                    archived={u.archived}
                    busy={busy}
                    name={u.name ?? u.email ?? 'user'}
                    onToggleArchived={() => void toggleArchived(u._id, !u.archived)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}

function UserRowMenu({
  archived,
  busy,
  name,
  onToggleArchived,
}: {
  archived: boolean;
  busy: boolean;
  name: string;
  onToggleArchived: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-haspopup="menu"
          aria-label={`Actions for ${name}`}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50"
          disabled={busy}
          type="button"
        >
          <KebabIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 min-w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
          role="menu"
          sideOffset={4}
        >
          <button
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onToggleArchived();
            }}
            role="menuitem"
            type="button"
          >
            {busy ? 'Saving…' : archived ? 'Unarchive' : 'Archive'}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function KebabIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}
