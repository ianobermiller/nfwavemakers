import { useState } from 'react';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageHeader } from './PageHeader.tsx';
import type { Role } from '../types.ts';

interface Props {
  userId: string;
  currentName: string;
  currentRole: Role;
}

const SELECTABLE_ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'student', label: 'Student', description: 'I compete as a debater' },
  { value: 'parent', label: 'Parent / Judge', description: 'I judge debate rounds' },
];

export function ProfileEdit({ userId, currentName, currentRole }: Props): React.JSX.Element {
  const [name, setName] = useState(currentName);
  const [role, setRole] = useState<Role>(currentRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(): Promise<void> {
    if (!name.trim() || !role) return;
    setLoading(true);
    setError('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await db.transact(db.tx.$users[userId]!.update({ name: name.trim(), role }));
      navigate('dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
      setLoading(false);
    }
  }

  const changed = name.trim() !== currentName || role !== currentRole;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Edit Profile" onBack={() => navigate('dashboard')} />

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-8 flex flex-col gap-4">
        <div>
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder="Jane Smith"
            autoFocus
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">I am a…</p>
          <div className="flex flex-col gap-2">
            {SELECTABLE_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`text-left px-4 py-3 border-2 rounded-xl transition-colors cursor-pointer ${
                  role === r.value
                    ? 'border-nf-blue dark:border-nf-blue-d bg-nf-blue-light dark:bg-slate-700'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {r.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.description}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
          onClick={() => void save()}
          disabled={loading || !name.trim() || !changed}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
