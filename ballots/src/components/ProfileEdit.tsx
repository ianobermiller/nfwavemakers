import { useRef, useState } from 'react';
import { cn } from 'cnfast';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageLayout } from './PageLayout.tsx';
import type { Role } from '../types.ts';
import { Avatar } from './Avatar.tsx';
import { Input } from './ui/Input.tsx';
import { avatarPath, resizeToWebP } from '../utils/imageUtils.ts';

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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: filesData } = db.useQuery({
    $files: { $: { where: { path: avatarPath(userId) } } },
  });
  const avatarURL = filesData?.$files?.[0]?.url as string | undefined;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const blob = await resizeToWebP(file);
      await db.storage.uploadFile(avatarPath(userId), blob, { contentType: 'image/webp' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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
    <PageLayout>
      <div className="max-w-sm mx-auto flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar name={name || currentName} imageURL={avatarURL} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center shadow cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {avatarUploading ? (
                <span className="w-3 h-3 border-2 border-nf-blue dark:border-nf-blue-d border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-600 dark:text-slate-300"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload profile photo"
            onChange={(e) => void handleAvatarChange(e)}
          />
          <p className="text-xs text-slate-400 dark:text-slate-500">Click to change photo</p>
        </div>

        <div>
          <label htmlFor="name">Full name</label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
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
          disabled={loading || !name.trim() || !changed}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </PageLayout>
  );
}
