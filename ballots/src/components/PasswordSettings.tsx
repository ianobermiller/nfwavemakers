import { useState } from 'react';
import { changePassword, requestPasswordReset } from '../data/auth.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { Input } from './ui/Input.tsx';

const MIN_PASSWORD_LENGTH = 8;

export function PasswordSettings(): React.JSX.Element {
  const me = useAppUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const canSave =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPasswordConfirm.length >= MIN_PASSWORD_LENGTH;

  async function savePassword(): Promise<void> {
    if (!canSave) return;
    if (newPassword !== newPasswordConfirm) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setNotice('Password updated.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not update your password'));
    } finally {
      setLoading(false);
    }
  }

  async function emailResetLink(): Promise<void> {
    const email = me?.email?.trim().toLowerCase();
    if (!email) {
      setError('Your profile has no email address on file.');
      return;
    }
    setResetLoading(true);
    setError('');
    setNotice('');
    try {
      await requestPasswordReset(email);
      setNotice('Check your email for a link to set or reset your password.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not send a password reset email'));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <section className="border-t border-slate-200 dark:border-slate-700 pt-5 mt-1">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">Password</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
        Change your password, or email yourself a link if you signed in with a code and do not have
        one yet.
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void savePassword();
        }}
      >
        <div>
          <label htmlFor="current-password">Current password</label>
          <Input
            autoComplete="current-password"
            id="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            value={currentPassword}
          />
        </div>
        <div>
          <label htmlFor="new-password">New password</label>
          <Input
            autoComplete="new-password"
            id="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            value={newPassword}
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>
        <div>
          <label htmlFor="new-password-confirm">Confirm new password</label>
          <Input
            autoComplete="new-password"
            id="new-password-confirm"
            minLength={MIN_PASSWORD_LENGTH}
            onChange={(event) => setNewPasswordConfirm(event.target.value)}
            type="password"
            value={newPasswordConfirm}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {notice}
          </p>
        )}

        <button
          className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={loading || !canSave}
          type="submit"
        >
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <button
        className="w-full mt-3 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 enabled:hover:bg-slate-50 enabled:dark:hover:bg-slate-700 font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={resetLoading || !me?.email}
        onClick={() => void emailResetLink()}
        type="button"
      >
        {resetLoading ? 'Sending…' : 'Email me a link to set a password'}
      </button>
    </section>
  );
}
