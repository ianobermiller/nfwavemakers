import { useState } from 'react';
import { cn } from 'cnfast';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Role } from '../types.ts';
import { Input } from './ui/Input.tsx';

const SELECTABLE_ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'student', label: 'Student', description: 'I compete as a debater' },
  { value: 'parent', label: 'Parent / Judge', description: 'I judge debate rounds' },
];

export function ProfileSetup(): React.JSX.Element {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const updateProfile = useMutation(api.users.updateProfile);

  async function save(): Promise<void> {
    if (!name.trim() || !role) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile({ name: name.trim(), role });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-16 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-nf-blue dark:text-nf-blue-d mb-1">Welcome!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tell us a bit about yourself to get started.
          </p>
        </div>

        <div>
          <label htmlFor="name">Full name</label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            autoFocus
            required
            aria-required="true"
          />
        </div>

        <div>
          <p
            id="role-group-label"
            className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2"
          >
            I am a…
          </p>
          <div role="group" aria-labelledby="role-group-label" className="flex flex-col gap-2">
            {SELECTABLE_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                aria-pressed={role === r.value}
                className={cn(
                  'text-left px-4 py-3 border-2 rounded-xl transition-colors cursor-pointer',
                  role === r.value
                    ? 'border-nf-blue dark:border-nf-blue-d bg-nf-blue-light dark:bg-slate-700'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
                )}
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
          disabled={loading || !name.trim() || !role}
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
