import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from 'cnfast';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageLayout } from './PageLayout.tsx';
import type { Role } from '../types.ts';
import { Avatar } from './Avatar.tsx';
import { AvatarCropDialog } from './AvatarCropDialog.tsx';
import { Input } from './ui/Input.tsx';
import { authClient } from '../authClient.ts';

interface Props {
  userId: string;
  currentName: string;
  currentRole: Role;
}

const SELECTABLE_ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'student', label: 'Student', description: 'I compete as a debater' },
  { value: 'parent', label: 'Parent / Judge', description: 'I judge debate rounds' },
];

export function ProfileEdit({ currentName, currentRole }: Props): React.JSX.Element {
  const [name, setName] = useState(currentName);
  const [role, setRole] = useState<Role>(currentRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const me = useQuery(api.users.current);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const saveAvatar = useMutation(api.users.saveAvatar);
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
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/webp' },
        body: blob,
      });
      if (!result.ok) {
        throw new Error('Failed to upload photo');
      }
      const { storageId } = (await result.json()) as { storageId: string };
      await saveAvatar({ storageId: storageId as Id<'_storage'> });
      setCropFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
      throw e;
    } finally {
      setAvatarUploading(false);
    }
  }

  async function save(): Promise<void> {
    if (!name.trim() || !role) return;
    setLoading(true);
    setError('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await updateProfile({ name: name.trim(), role });
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

        {'PublicKeyCredential' in window && <PasskeySettings />}
      </div>

      <AvatarCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    </PageLayout>
  );
}

function PasskeySettings(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passkeys, setPasskeys] =
    useState<Array<{ id: string; name?: null | string | undefined }>>();

  const refresh = useCallback(async (): Promise<void> => {
    const result = await authClient.passkey.listUserPasskeys();
    throwIfError(result.error);
    setPasskeys(result.data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load passkeys'))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function addPasskey(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await authClient.passkey.addPasskey({ name: 'NF Wavemakers passkey' });
      throwIfError(result.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add passkey');
    } finally {
      setLoading(false);
    }
  }

  async function removePasskey(id: string): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await authClient.passkey.deletePasskey({ id });
      throwIfError(result.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove passkey');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-5">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">Passkeys</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sign in with Face ID, Touch ID, or your device PIN.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {passkeys?.map((passkey) => (
          <div
            className="flex items-center gap-3 rounded-xl bg-slate-100 dark:bg-slate-700 p-3"
            key={passkey.id}
          >
            <span className="text-sm font-semibold">{passkey.name || 'Passkey'}</span>
            <button
              className="ml-auto text-sm text-red-600 disabled:opacity-50"
              disabled={loading}
              onClick={() => void removePasskey(passkey.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="w-full py-2.5 border border-slate-300 dark:border-slate-600 font-semibold rounded-xl disabled:opacity-50"
          disabled={loading}
          onClick={() => void addPasskey()}
          type="button"
        >
          {loading ? 'Please wait…' : 'Add a passkey'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}

function throwIfError(error: null | { message?: string | undefined } | undefined): void {
  if (error) {
    throw new Error(error.message ?? 'Authentication failed');
  }
}
