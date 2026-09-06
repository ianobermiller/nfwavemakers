import { useState } from 'react';
import {
  createAccount,
  requestPasswordReset,
  requestSignInCode,
  signInWithCode,
  signInWithPassword,
} from '../data/auth.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { Input } from './ui/Input.tsx';

type Mode = 'code' | 'password' | 'signUp';

export function Auth(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState<string>();
  const [mode, setMode] = useState<Mode>('code');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitCredentials(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'code') {
        setOtpId(await requestSignInCode(normalizedEmail));
      } else if (mode === 'signUp') {
        await createAccount(normalizedEmail, password);
      } else {
        await signInWithPassword(normalizedEmail, password);
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(): Promise<void> {
    if (!otpId || !code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await signInWithCode(otpId, code.trim());
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Verification failed'));
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(normalizedEmail);
      setNotice('Check your email for a password reset link.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not request a password reset'));
    } finally {
      setLoading(false);
    }
  }

  const needsPassword = mode !== 'code';

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-16 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-nf-blue dark:text-nf-blue-d mb-1">
            NF Wavemakers Ballots
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to judge rounds and review feedback.
          </p>
        </div>

        {!otpId ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCredentials();
            }}
          >
            <div>
              <label htmlFor="email">Email address</label>
              <Input
                aria-describedby={error ? 'auth-error' : undefined}
                aria-invalid={!!error}
                autoComplete="email"
                autoFocus
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            {needsPassword && (
              <div>
                <label htmlFor="password">Password</label>
                <Input
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  id="password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            )}
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              disabled={loading || !email.trim() || (needsPassword && password.length < 8)}
              type="submit"
            >
              {loading
                ? 'Please wait…'
                : mode === 'code'
                  ? 'Send Sign-in Code'
                  : mode === 'signUp'
                    ? 'Create Account'
                    : 'Sign In'}
            </button>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              {mode !== 'code' && (
                <button
                  className="text-nf-accent underline"
                  onClick={() => setMode('code')}
                  type="button"
                >
                  Use an email code
                </button>
              )}
              {mode !== 'password' && (
                <button
                  className="text-nf-accent underline"
                  onClick={() => setMode('password')}
                  type="button"
                >
                  Use a password
                </button>
              )}
              {mode === 'password' && (
                <>
                  <button
                    className="text-nf-accent underline"
                    onClick={() => void resetPassword()}
                    type="button"
                  >
                    Forgot password?
                  </button>
                  <button
                    className="text-nf-accent underline"
                    onClick={() => setMode('signUp')}
                    type="button"
                  >
                    Create an account
                  </button>
                </>
              )}
            </div>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyCode();
            }}
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We sent a code to{' '}
              <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.
            </p>
            <div>
              <label htmlFor="code">Verification code</label>
              <Input
                aria-describedby={error ? 'code-error' : undefined}
                aria-invalid={!!error}
                autoFocus
                id="code"
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                required
                type="text"
                value={code}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="code-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              disabled={loading || !code.trim()}
              type="submit"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none text-center"
              onClick={() => {
                setOtpId(undefined);
                setCode('');
                setError('');
              }}
              type="button"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
