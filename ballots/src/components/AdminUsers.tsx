import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { createAccounts, type CreateAccountResult, setUserArchived } from '../data/api.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { useUsers } from '../hooks/data.ts';
import { parseAccountCsv } from '../lib/accountCsv.ts';
import type { Role } from '../types.ts';
import { PageLayout } from './PageLayout.tsx';
import { Avatar } from './Avatar.tsx';
import { Input } from './ui/Input.tsx';
import { Select } from './ui/Select.tsx';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent / Judge' },
  { value: 'admin', label: 'Admin' },
];

function roleFromSelect(value: string): Role {
  if (value === 'admin' || value === 'parent' || value === 'student') return value;
  return 'student';
}

export function AdminUsers(): React.JSX.Element {
  const [showArchived, setShowArchived] = useState(false);
  const me = useAppUser();
  const users = useUsers(showArchived);
  const isLoading = users === undefined;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  async function toggleArchived(userId: string, archived: boolean): Promise<void> {
    setPendingId(userId);
    setError('');
    try {
      await setUserArchived(userId, archived);
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
        <div className="flex items-center gap-3 shrink-0">
          <label className="mb-0 inline-flex items-center gap-2 h-9 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              checked={showArchived}
              className="size-4 accent-nf-blue"
              onChange={(e) => setShowArchived(e.target.checked)}
              type="checkbox"
            />
            Show archived
          </label>
          <button
            className="inline-flex items-center h-9 px-3 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d text-white enabled:hover:bg-nf-blue-mid disabled:opacity-50"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create accounts
          </button>
        </div>
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
          const isMe = me?.id === u.id;
          const busy = pendingId === u.id;
          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 ${
                u.archived ? 'opacity-70' : ''
              }`}
            >
              <Avatar
                name={u.name ?? u.email ?? u.id}
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
                    onToggleArchived={() => void toggleArchived(u.id, !u.archived)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateAccountsDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageLayout>
  );
}

function CreateAccountsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<'single' | 'csv'>('single');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<CreateAccountResult[] | null>(null);
  const [csvIssues, setCsvIssues] = useState<{ line: number; reason: string }[]>([]);

  function resetForm(): void {
    setName('');
    setEmail('');
    setRole('student');
    setCsvText('');
    setCsvFileName('');
    setError('');
    setResults(null);
    setCsvIssues([]);
    setBusy(false);
    setMode('single');
  }

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setCsvFileName(file.name);
    setCsvText(await file.text());
    setResults(null);
    setCsvIssues([]);
    setError('');
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setError('');
    setResults(null);
    setCsvIssues([]);
    try {
      if (mode === 'single') {
        const created = await createAccounts([{ name, email, role }]);
        setResults(created);
        if (created[0]?.status === 'created') {
          setName('');
          setEmail('');
        }
      } else {
        const parsed = parseAccountCsv(csvText, role);
        setCsvIssues(parsed.issues);
        if (parsed.rows.length === 0) {
          setError(
            parsed.issues.length > 0
              ? 'No valid rows to create. Fix the issues below.'
              : 'CSV is empty. Add rows with name and email.',
          );
          return;
        }
        const created = await createAccounts(
          parsed.rows.map((row) => ({
            name: row.name,
            email: row.email,
            role: row.role ?? role,
          })),
        );
        setResults(created);
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not create accounts'));
    } finally {
      setBusy(false);
    }
  }

  const parsedPreview =
    mode === 'csv' && csvText ? parseAccountCsv(csvText, role) : { rows: [], issues: [] };
  const canSubmit =
    mode === 'single'
      ? name.trim().length > 0 && email.trim().length > 0
      : csvText.trim().length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,calc(100vw-2rem))] max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-5 flex flex-col gap-4">
          <div>
            <Dialog.Title className="text-base font-bold text-slate-800 dark:text-slate-100">
              Create accounts
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              People can sign in later with an email code. Nothing is emailed when you create an
              account.
            </Dialog.Description>
          </div>

          <div className="flex gap-2" role="tablist" aria-label="Create mode">
            {(
              [
                ['single', 'One person'],
                ['csv', 'CSV bulk'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition-colors ${
                  mode === value
                    ? 'border-nf-blue dark:border-nf-blue-d bg-nf-blue-light dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => {
                  setMode(value);
                  setResults(null);
                  setError('');
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="create-role">Type</label>
            <Select
              id="create-role"
              value={role}
              onChange={(e) => setRole(roleFromSelect(e.target.value))}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {mode === 'csv' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Default for rows without a role column. A CSV <code>role</code> column overrides
                this per row.
              </p>
            )}
          </div>

          {mode === 'single' ? (
            <>
              <div>
                <label htmlFor="create-name">Full name</label>
                <Input
                  id="create-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="create-email">Email</label>
                <Input
                  id="create-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="create-csv">CSV file</label>
                <Input
                  id="create-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Columns: <code>name</code>, <code>email</code>, optional <code>role</code>.
                  {csvFileName ? ` Loaded ${csvFileName}.` : ''}
                </p>
              </div>
              <div>
                <label htmlFor="create-csv-text">Or paste CSV</label>
                <textarea
                  id="create-csv-text"
                  className="w-full min-h-28 px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none transition-colors focus:border-nf-accent font-[inherit] font-mono"
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setCsvFileName('');
                    setResults(null);
                    setCsvIssues([]);
                  }}
                  placeholder={
                    'name,email,role\nAlice Student,alice@example.com\nBob Judge,bob@example.com,parent'
                  }
                />
              </div>
              {csvText.trim() && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {parsedPreview.rows.length} ready
                  {parsedPreview.issues.length > 0
                    ? `, ${parsedPreview.issues.length} row issue${parsedPreview.issues.length === 1 ? '' : 's'}`
                    : ''}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {(csvIssues.length > 0 || (results && results.length > 0)) && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {csvIssues.map((issue) => (
                  <li
                    key={`issue-${issue.line}-${issue.reason}`}
                    className="px-3 py-2 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30"
                  >
                    Line {issue.line}: {issue.reason}
                  </li>
                ))}
                {(results ?? []).map((result) => (
                  <li
                    key={`${result.status}-${result.email}-${result.name}`}
                    className={`px-3 py-2 ${
                      result.status === 'created'
                        ? 'text-aff dark:text-aff-d'
                        : result.status === 'skipped'
                          ? 'text-amber-800 dark:text-amber-200'
                          : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {result.status === 'created' && (
                      <>
                        Created {result.name} ({result.email}) as {result.role}
                      </>
                    )}
                    {result.status === 'skipped' && (
                      <>
                        Skipped {result.name || result.email}: {result.reason}
                      </>
                    )}
                    {result.status === 'invalid' && (
                      <>
                        {result.name || result.email}: {result.reason}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Dialog.Close
              className="px-3 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 enabled:hover:bg-slate-100 enabled:dark:hover:bg-slate-700"
              type="button"
            >
              Close
            </Dialog.Close>
            <button
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d text-white enabled:hover:bg-nf-blue-mid disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={busy || !canSubmit}
              onClick={() => void submit()}
              type="button"
            >
              {busy ? 'Creating…' : mode === 'single' ? 'Create account' : 'Create accounts'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 enabled:hover:bg-slate-100 enabled:dark:hover:bg-slate-700 enabled:hover:text-slate-800 enabled:dark:hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 enabled:hover:bg-slate-50 enabled:dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
