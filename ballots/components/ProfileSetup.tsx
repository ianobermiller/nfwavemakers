import { useState } from 'react';
import { cn } from 'cnfast';
import { updateProfile } from '../data/api.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { STUDENT_CATEGORY_LABELS, type Role, type StudentCategory } from '../types.ts';
import { Input } from './ui/Input.tsx';

const SELECTABLE_ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'I compete as a debater' },
  { value: 'parent', label: 'Parent / Judge', description: 'I judge debate rounds' },
];

const CATEGORY_OPTIONS: { value: StudentCategory; description: string }[] = [
  { value: 'speech', description: 'I compete in speech events only' },
  { value: 'tp', description: 'I debate Team Policy' },
  { value: 'ld', description: 'I debate Lincoln-Douglas' },
];

export function ProfileSetup(): React.JSX.Element {
  const me = useAppUser();
  const [name, setName] = useState(me?.name ?? '');
  const [role, setRole] = useState<Role | ''>(me?.role === 'admin' ? '' : (me?.role ?? ''));
  const [category, setCategory] = useState<StudentCategory | ''>(me?.category ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsCategory = role === 'student';
  const canSave = Boolean(name.trim() && role && (!needsCategory || category));

  async function save(): Promise<void> {
    if (!name.trim() || !role) return;
    if (role === 'student' && !category) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile(name, role, role === 'student' ? category || undefined : undefined);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Failed to save profile'));
      setLoading(false);
    }
  }

  function chooseRole(next: Role): void {
    setRole(next);
    if (next !== 'student') setCategory('');
  }

  return (
    <div className="flex items-start justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 sm:p-8 flex flex-col gap-4">
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
                onClick={() => chooseRole(r.value)}
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

        {needsCategory && (
          <div>
            <p
              id="category-group-label"
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2"
            >
              I compete in…
            </p>
            <div
              role="group"
              aria-labelledby="category-group-label"
              className="flex flex-col gap-2"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  aria-pressed={category === option.value}
                  className={cn(
                    'text-left px-4 py-3 border-2 rounded-xl transition-colors cursor-pointer',
                    category === option.value
                      ? 'border-nf-blue dark:border-nf-blue-d bg-nf-blue-light dark:bg-slate-700'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
                  )}
                >
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    {STUDENT_CATEGORY_LABELS[option.value]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={() => void save()}
          disabled={loading || !canSave}
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
