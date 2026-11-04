import { useRef, useState } from 'react';
import { cn } from 'cnfast';
import { STUDENT_CATEGORY_LABELS, type Role, type StudentCategory } from '../types.ts';
import { updateAvatar, updateProfile } from '../data/api.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { navigate } from '@/hooks/useHashRoute.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { Avatar } from './Avatar.tsx';
import { AvatarCropDialog } from './AvatarCropDialog.tsx';
import { PasskeyRegistration } from './PasskeyRegistration.tsx';
import { PasswordSettings } from './PasswordSettings.tsx';
import { Input } from './ui/Input.tsx';

interface Props {
  userId: string;
  currentName: string;
  currentRole: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  student: 'Student',
  parent: 'Parent / Judge',
};

const CATEGORY_OPTIONS: { value: StudentCategory; description: string }[] = [
  { value: 'speech', description: 'I compete in speech events only' },
  { value: 'tp', description: 'I debate Team Policy' },
  { value: 'ld', description: 'I debate Lincoln-Douglas' },
];

export function ProfileEdit({ currentName, currentRole }: Props): React.JSX.Element {
  const me = useAppUser();
  const currentCategory = me?.category;
  const [name, setName] = useState(currentName);
  const [category, setCategory] = useState<StudentCategory | ''>(currentCategory ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarURL = me?.avatarUrl ?? undefined;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (file) setCropFile(file);
  }

  async function handleCropConfirm(blob: Blob): Promise<void> {
    setAvatarUploading(true);
    setError('');
    try {
      await updateAvatar(blob);
      setCropFile(null);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Failed to upload photo'));
      throw cause;
    } finally {
      setAvatarUploading(false);
    }
  }

  async function save(): Promise<void> {
    if (!name.trim()) return;
    if (currentRole === 'student' && !category) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile(
        name,
        undefined,
        currentRole === 'student' ? category || undefined : undefined,
      );
      navigate('dashboard');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Failed to save profile'));
      setLoading(false);
    }
  }

  const changed =
    name.trim() !== currentName ||
    (currentRole === 'student' && category !== (currentCategory ?? ''));
  const canSave = Boolean(name.trim() && changed && (currentRole !== 'student' || category));

  return (
    <PageLayout>
      <BackLink to="dashboard" label="Dashboard" />
      <div className="max-w-sm mx-auto flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar name={name || currentName} imageURL={avatarURL} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center shadow cursor-pointer enabled:hover:bg-slate-50 enabled:dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            onChange={handleFileSelect}
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
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Role</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {ROLE_LABELS[currentRole]}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            A club admin can change your role if it is wrong.
          </p>
        </div>

        {currentRole === 'student' && (
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
          {loading ? 'Saving…' : 'Save'}
        </button>

        <PasswordSettings />
        <PasskeyRegistration />
      </div>

      <AvatarCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    </PageLayout>
  );
}
