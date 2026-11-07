import { useEffect, useState } from 'react';
import { refreshSession, resendVerificationEmail, signOut } from '../data/auth.ts';
import type { User } from '../data/model.ts';
import { errorMessage } from '../data/pocketbase.ts';

interface Props {
  user: User;
}

export function PendingAccess({ user }: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const email = user.email ?? '';

  useEffect(() => {
    document.title = 'Almost there — North Florida Wavemakers';
  }, []);

  useEffect(() => {
    if (user.emailVerified) return undefined;

    async function refreshVerified(): Promise<void> {
      const result = await refreshSession();
      if (result === 'refreshed') {
        window.dispatchEvent(new Event('ballots-profile-changed'));
      }
    }

    function onVisible(): void {
      if (document.visibilityState === 'visible') void refreshVerified();
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const interval = window.setInterval(() => void refreshVerified(), 15_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(interval);
    };
  }, [user.emailVerified]);

  async function resend(): Promise<void> {
    if (!email) {
      setError('No email on this account to verify.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await resendVerificationEmail(email);
      setNotice('Verification email sent. Check your inbox.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not send a verification email'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-nf-blue dark:text-nf-blue-d mb-1">Almost there</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Thanks for joining. Once your email is verified and a club admin approves your account,
            lessons and ballots will open up.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          <StatusRow
            done={user.emailVerified}
            title="Verify your email"
            detail={
              user.emailVerified
                ? 'Your email is verified.'
                : email
                  ? `We sent a link to ${email}. Open it, then refresh this page.`
                  : 'Add an email to this account, then verify it.'
            }
          />
          <StatusRow
            done={user.approved}
            title="Club Approval"
            detail={
              user.approved
                ? 'A club admin has approved your account.'
                : 'A club admin still needs to approve your account. You will get access once they do.'
            }
          />
        </ul>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-aff dark:text-aff-d">{notice}</p>}

        <div className="flex flex-col gap-2">
          {!user.emailVerified && (
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={busy || !email}
              onClick={() => void resend()}
              type="button"
            >
              {busy ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <button
            className="w-full py-3 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 enabled:hover:bg-slate-100 enabled:dark:hover:bg-slate-700 cursor-pointer"
            onClick={signOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  done,
  title,
  detail,
}: {
  done: boolean;
  title: string;
  detail: string;
}): React.JSX.Element {
  return (
    <li
      className={`rounded-xl border-2 px-4 py-3 ${
        done
          ? 'border-aff/40 bg-aff/5 dark:border-aff-d/40 dark:bg-aff-d/10'
          : 'border-slate-200 dark:border-slate-600'
      }`}
    >
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {done ? '✓ ' : ''}
        {title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detail}</p>
    </li>
  );
}
