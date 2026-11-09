import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { cn } from 'cnfast';
import { dialogClass } from './ui/Card.tsx';
import { headingClass } from './ui/Heading.tsx';
import { mutedClass } from './ui/Muted.tsx';
import {
  approveUser,
  createAccounts,
  type CreateAccountResult,
  setDebatePartner,
  setUserArchived,
  updateMember,
} from '../data/api.ts';
import type { User } from '../data/model.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { useUsers } from '../hooks/data.ts';
import { parseAccountCsv } from '../lib/accountCsv.ts';
import { fuzzyRank } from '../lib/fuzzySearch.ts';
import {
  STUDENT_CATEGORIES,
  STUDENT_CATEGORY_LABELS,
  parseStudentCategory,
  type Role,
  type StudentCategory,
} from '../types.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { Avatar } from './Avatar.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { Input } from './ui/Input.tsx';
import { Select } from './ui/Select.tsx';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent / Judge' },
  { value: 'admin', label: 'Admin' },
];

type UserListView = Role | 'pending' | 'archived';

const USER_LIST_VIEWS: { value: UserListView; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'student', label: 'Students' },
  { value: 'parent', label: 'Parents' },
  { value: 'admin', label: 'Admins' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_COPY: Record<UserListView, string> = {
  pending: 'No pending sign-ups.',
  student: 'No students yet.',
  parent: 'No parents yet.',
  admin: 'No admins yet.',
  archived: 'No archived users.',
};

function isPendingUser(user: User): boolean {
  return !user.archived && !user.approved;
}

function roleFromSelect(value: string): Role {
  if (value === 'admin' || value === 'parent' || value === 'student') return value;
  return 'student';
}

function roleLabel(role: Role): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function UserListToggle({
  value,
  onChange,
}: {
  value: UserListView;
  onChange: (value: UserListView) => void;
}): React.JSX.Element {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : event.key === 'Home'
            ? 'home'
            : event.key === 'End'
              ? 'end'
              : null;
    if (delta === null) return;
    event.preventDefault();
    const index = USER_LIST_VIEWS.findIndex((tab) => tab.value === value);
    const nextIndex =
      delta === 'home'
        ? 0
        : delta === 'end'
          ? USER_LIST_VIEWS.length - 1
          : (index + delta + USER_LIST_VIEWS.length) % USER_LIST_VIEWS.length;
    const next = USER_LIST_VIEWS[nextIndex];
    if (!next) return;
    onChange(next.value);
    buttons.current[nextIndex]?.focus();
  }

  return (
    <div
      aria-label="User list"
      className="inline-flex h-11 max-w-full items-stretch overflow-x-auto rounded-lg border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:shrink-0"
      onKeyDown={onKeyDown}
      role="radiogroup"
    >
      {USER_LIST_VIEWS.map((tab, index) => {
        const selected = value === tab.value;
        const previousSelected = index > 0 && value === USER_LIST_VIEWS[index - 1]?.value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            aria-checked={selected}
            className={cn(
              'flex items-center px-4 text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors',
              index > 0 &&
                !selected &&
                !previousSelected &&
                'border-l border-slate-200 dark:border-slate-600',
              selected
                ? 'bg-nf-blue text-white dark:bg-nf-blue-d'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
            onClick={() => onChange(tab.value)}
            role="radio"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminUsers(): React.JSX.Element {
  const allUsersLive = useUsers(true);
  const [view, setView] = useState<UserListView>('pending');
  const [query, setQuery] = useState('');
  const me = useAppUser();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  // Active and archived load together so tab switches filter without a refetch.
  const allUsers = allUsersLive.read();

  const visibleUsers = allUsers.filter((u) => {
    if (view === 'archived') return u.archived;
    if (view === 'pending') return isPendingUser(u);
    return !u.archived && u.approved && u.role === view;
  });
  const listedUsers = fuzzyRank(visibleUsers, query, (user) => [user.name ?? '', user.email ?? '']);
  const searching = query.trim().length > 0;

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

  async function approve(user: User): Promise<void> {
    if (!user.name?.trim() || !user.role) return;
    setPendingId(user.id);
    setError('');
    try {
      // Students who never picked a category are admitted as speech-only.
      await approveUser(user.id, user.role === 'student' && !user.category ? 'speech' : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve user');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <PageLayout>
      <BackLink to="dashboard" label="Dashboard" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Users</h1>
        <button
          className="inline-flex h-11 w-full items-center justify-center px-3 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d text-white enabled:hover:bg-nf-blue-mid disabled:opacity-50 sm:h-9 sm:w-auto sm:shrink-0"
          onClick={() => setCreateOpen(true)}
          type="button"
        >
          Create accounts
        </button>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <UserListToggle value={view} onChange={setView} />
        <div className="min-w-0 w-full flex-1 sm:min-w-48">
          <Input
            aria-label="Search users"
            className="h-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            type="search"
            value={query}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {listedUsers.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          {searching ? `No matches for "${query.trim()}".` : EMPTY_COPY[view]}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {listedUsers.map((u) => {
          const isMe = me?.id === u.id;
          const busy = pendingId === u.id;
          const pending = !u.approved && !u.archived;
          const canApprove = Boolean(u.name?.trim() && u.role);
          const approveHint = !u.name?.trim()
            ? 'Add a name before approving'
            : !u.role
              ? 'Choose a role before approving'
              : undefined;
          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3 sm:items-center ${
                u.archived ? 'opacity-70' : ''
              }`}
            >
              <Avatar
                name={u.name ?? u.email ?? u.id}
                imageURL={u.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {u.name?.trim() || 'Unnamed'}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {u.email ?? 'no email'}
                  </span>
                  {u.role === 'student' && u.approved && (
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {partnerLabel(u, allUsers)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0 sm:justify-end">
                  {u.archived && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                      archived
                    </span>
                  )}
                  {!u.emailVerified && !u.archived && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      email unverified
                    </span>
                  )}
                  {!pending && u.role && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {roleLabel(u.role)}
                    </span>
                  )}
                  {!pending && u.role === 'student' && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {STUDENT_CATEGORY_LABELS[u.category ?? 'speech']}
                    </span>
                  )}
                  {!isMe && pending && (
                    <button
                      className="inline-flex h-11 items-center justify-center px-3 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d text-white enabled:hover:bg-nf-blue-mid disabled:opacity-50 disabled:cursor-not-allowed sm:h-9"
                      disabled={busy || !canApprove}
                      onClick={() => void approve(u)}
                      title={approveHint}
                      type="button"
                    >
                      {busy ? 'Saving…' : 'Approve'}
                    </button>
                  )}
                  {!isMe && (
                    <UserRowMenu
                      archived={u.archived}
                      busy={busy}
                      name={u.name ?? u.email ?? 'user'}
                      onEdit={() => setEditUserId(u.id)}
                      onToggleArchived={() => void toggleArchived(u.id, !u.archived)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CreateAccountsDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        user={allUsers.find((user) => user.id === editUserId) ?? null}
        users={allUsers}
        onOpenChange={(open) => {
          if (!open) setEditUserId(null);
        }}
      />
    </PageLayout>
  );
}

function partnerLabel(student: User, users: User[]): string {
  if (!student.partnerId) return 'No debate partner';
  const partner = users.find((user) => user.id === student.partnerId);
  if (!partner) return 'Debate partner set';
  const name = partner.name ?? partner.email ?? 'Unnamed';
  return partner.archived ? `Partner: ${name} (archived)` : `Partner: ${name}`;
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
        if (created[0]?.status === 'created' || created[0]?.status === 'linked') {
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
      : parsedPreview.rows.length > 0;

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
        <Dialog.Content
          className={dialogClass('max-h-[min(40rem,calc(100vh-2rem))] overflow-y-auto')}
          style={{ maxHeight: 'min(40rem, calc(100dvh - 2rem))' }}
        >
          <div>
            <Dialog.Title className={headingClass('card')}>Create accounts</Dialog.Title>
            <Dialog.Description className={mutedClass('sm', 'mt-1')}>
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
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {parsedPreview.rows.length} ready
                    {parsedPreview.issues.length > 0
                      ? `, ${parsedPreview.issues.length} row issue${parsedPreview.issues.length === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {(parsedPreview.rows.length > 0 || parsedPreview.issues.length > 0) &&
                    !results && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                          {parsedPreview.rows.map((row) => (
                            <li
                              key={`preview-${row.line}-${row.email}`}
                              className="px-3 py-2 text-slate-700 dark:text-slate-200"
                            >
                              {row.name} ({row.email}) as {row.role}
                            </li>
                          ))}
                          {parsedPreview.issues.map((issue) => (
                            <li
                              key={`preview-issue-${issue.line}-${issue.reason}`}
                              className="px-3 py-2 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30"
                            >
                              Line {issue.line}: {issue.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
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
                      result.status === 'created' || result.status === 'linked'
                        ? 'text-aff dark:text-aff-d'
                        : result.status === 'skipped'
                          ? 'text-amber-800 dark:text-amber-200'
                          : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {result.status === 'created' && (
                      <>
                        Created an account for {result.name} ({result.email}) as {result.role}
                      </>
                    )}
                    {result.status === 'linked' && (
                      <>
                        Added a club role for {result.name} ({result.email}) on the existing sign-in
                        as {result.role}
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

function EditUserDialog({
  onOpenChange,
  user,
  users,
}: {
  onOpenChange: (open: boolean) => void;
  user: User | null;
  users: User[];
}): React.JSX.Element {
  return (
    <Dialog.Root open={user !== null} onOpenChange={onOpenChange}>
      {user && (
        <EditUserForm key={user.id} user={user} users={users} onClose={() => onOpenChange(false)} />
      )}
    </Dialog.Root>
  );
}

function EditUserForm({
  onClose,
  user,
  users,
}: {
  onClose: () => void;
  user: User;
  users: User[];
}): React.JSX.Element {
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState<Role | ''>(user.role ?? '');
  const [category, setCategory] = useState<StudentCategory>(user.category ?? 'speech');
  const [partnerId, setPartnerId] = useState(user.partnerId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canSave = Boolean(name.trim() && role);
  // Partner is only meaningful once the student is in the club; pending accounts skip it.
  const showPartner = role === 'student' && user.approved;
  const partnerChoices = users.filter(
    (candidate) =>
      candidate.role === 'student' &&
      candidate.id !== user.id &&
      (!candidate.archived || candidate.id === user.partnerId),
  );
  const partnerOptions = partnerChoices.map((choice) => {
    const label = choice.name ?? choice.email ?? 'Unnamed';
    return {
      id: choice.id,
      name: choice.archived ? `${label} (archived)` : label,
    };
  });
  const partnerAvatarURLs = Object.fromEntries(
    partnerChoices
      .filter((choice): choice is typeof choice & { avatarUrl: string } => choice.avatarUrl != null)
      .map((choice) => [choice.id, choice.avatarUrl]),
  );

  async function save(): Promise<void> {
    if (!role) return;
    setBusy(true);
    setError('');
    try {
      const nextPartnerId = showPartner ? partnerId : '';
      const partnerChanged = nextPartnerId !== (user.partnerId ?? '');
      // Partner writes only see students, so clear the link before a role change away.
      const leavingStudent = user.role === 'student' && role !== 'student';
      if (partnerChanged && leavingStudent) {
        await setDebatePartner(user.id, '');
      }
      await updateMember(user.id, {
        name,
        role,
        ...(role === 'student' ? { category } : {}),
      });
      if (partnerChanged && !leavingStudent) {
        await setDebatePartner(user.id, nextPartnerId);
      }
      onClose();
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not save user'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <Dialog.Content className={dialogClass(showPartner ? 'overflow-visible' : undefined)}>
        <div>
          <Dialog.Title className={headingClass('card')}>Edit user</Dialog.Title>
          <Dialog.Description className={mutedClass('sm', 'mt-1')}>
            {user.email ?? 'This account'}
          </Dialog.Description>
        </div>
        <div>
          <label htmlFor="edit-user-name">Full name</label>
          <Input
            id="edit-user-name"
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            type="text"
            value={name}
          />
        </div>
        <div>
          <label htmlFor="edit-user-role">Role</label>
          <Select
            id="edit-user-role"
            disabled={busy}
            onChange={(event) => {
              const next = roleFromSelect(event.target.value);
              setRole(next);
            }}
            value={role}
          >
            {!role && (
              <option disabled value="">
                Choose role
              </option>
            )}
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {role === 'student' && (
          <div>
            <label htmlFor="edit-user-category">Category</label>
            <Select
              id="edit-user-category"
              disabled={busy}
              onChange={(event) => {
                const next = parseStudentCategory(event.target.value);
                if (next) setCategory(next);
              }}
              value={category}
            >
              {STUDENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {STUDENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
        )}
        {showPartner && (
          <div>
            <label htmlFor="edit-user-partner">Debate partner</label>
            <p className={mutedClass('sm', 'mb-2')}>
              They become each other&apos;s regular partner. A debate can still use a different
              teammate.
            </p>
            <StudentPicker
              id="edit-user-partner"
              value={partnerId}
              onChange={setPartnerId}
              students={partnerOptions}
              avatarURLs={partnerAvatarURLs}
              disabled={busy}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Dialog.Close
            className="px-3 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 enabled:hover:bg-slate-100 enabled:dark:hover:bg-slate-700"
            type="button"
          >
            Cancel
          </Dialog.Close>
          <button
            className="px-3 py-2 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d text-white enabled:hover:bg-nf-blue-mid disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy || !canSave}
            onClick={() => void save()}
            type="button"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function UserRowMenu({
  archived,
  busy,
  name,
  onEdit,
  onToggleArchived,
}: {
  archived: boolean;
  busy: boolean;
  name: string;
  onEdit: () => void;
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
              onEdit();
            }}
            role="menuitem"
            type="button"
          >
            Edit
          </button>
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
