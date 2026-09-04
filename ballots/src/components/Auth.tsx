import { useState } from 'react';
import { authClient } from '../authClient.ts';
import { Input } from './ui/Input.tsx';

type Mode = 'code' | 'password' | 'reset' | 'signUp';
type Verification = 'email-code' | 'password-reset' | 'password-sign-up';

function throwIfError(error: null | { message?: string | undefined } | undefined): void {
  if (error) {
    throw new Error(error.message ?? 'Authentication failed');
  }
}

export function Auth(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<Mode>('code');
  const [verification, setVerification] = useState<Verification>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitCredentials(): Promise<void> {
    const value = email.trim();
    if (!value) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'code') {
        const result = await authClient.emailOtp.sendVerificationOtp({
          email: value,
          type: 'sign-in',
        });
        throwIfError(result.error);
        setVerification('email-code');
      } else if (mode === 'reset') {
        const result = await authClient.emailOtp.requestPasswordReset({ email: value });
        throwIfError(result.error);
        setVerification('password-reset');
      } else if (mode === 'signUp') {
        const result = await authClient.signUp.email({
          email: value,
          name: value,
          password,
        });
        throwIfError(result.error);
        setVerification('password-sign-up');
      } else {
        const result = await authClient.signIn.email({ email: value, password });
        throwIfError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function verify(): Promise<void> {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (verification === 'email-code') {
        const result = await authClient.signIn.emailOtp({
          email: email.trim(),
          otp: code.trim(),
        });
        throwIfError(result.error);
      } else if (verification === 'password-reset') {
        const result = await authClient.emailOtp.resetPassword({
          email: email.trim(),
          otp: code.trim(),
          password,
        });
        throwIfError(result.error);
        const signInResult = await authClient.signIn.email({ email: email.trim(), password });
        throwIfError(signInResult.error);
      } else {
        const result = await authClient.emailOtp.verifyEmail({
          email: email.trim(),
          otp: code.trim(),
        });
        throwIfError(result.error);
        const signInResult = await authClient.signIn.email({ email: email.trim(), password });
        throwIfError(signInResult.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPasskey(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await authClient.signIn.passkey();
      throwIfError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Passkey sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  const needsPassword = mode === 'password' || mode === 'signUp';

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

        {!verification ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCredentials();
            }}
          >
            <div>
              <label htmlFor="email">Email address</label>
              <Input
                autoComplete="email webauthn"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'email-error' : undefined}
              />
            </div>
            {needsPassword && (
              <div>
                <label htmlFor="password">Password</label>
                <Input
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password webauthn'}
                  id="password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            )}
            {error && (
              <p id="email-error" role="alert" className="text-red-600 text-sm -mt-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              disabled={loading || !email.trim() || (needsPassword && password.length < 8)}
            >
              {loading
                ? 'Please wait…'
                : mode === 'code'
                  ? 'Send Magic Code'
                  : mode === 'reset'
                    ? 'Send Reset Code'
                    : mode === 'signUp'
                      ? 'Create Account'
                      : 'Sign In'}
            </button>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              {mode !== 'code' && (
                <button
                  type="button"
                  className="text-nf-accent underline"
                  onClick={() => setMode('code')}
                >
                  Use an email code
                </button>
              )}
              {mode !== 'password' && (
                <button
                  type="button"
                  className="text-nf-accent underline"
                  onClick={() => setMode('password')}
                >
                  Use a password
                </button>
              )}
              {mode === 'password' && (
                <>
                  <button
                    type="button"
                    className="text-nf-accent underline"
                    onClick={() => setMode('reset')}
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    className="text-nf-accent underline"
                    onClick={() => setMode('signUp')}
                  >
                    Create an account
                  </button>
                </>
              )}
            </div>

            {'PublicKeyCredential' in window && (
              <>
                <p className="text-center text-sm text-slate-400">or</p>
                <button
                  type="button"
                  className="w-full py-3 border border-slate-300 dark:border-slate-600 font-semibold rounded-xl"
                  disabled={loading}
                  onClick={() => void signInWithPasskey()}
                >
                  Sign in with a passkey
                </button>
              </>
            )}
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We sent a 6-digit code to{' '}
              <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.
            </p>
            <div>
              <label htmlFor="code">Verification code</label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'code-error' : undefined}
              />
            </div>
            {verification !== 'email-code' && (
              <div>
                <label htmlFor="new-password">New password</label>
                <Input
                  autoComplete="new-password"
                  id="new-password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            )}
            {error && (
              <p id="code-error" role="alert" className="text-red-600 text-sm -mt-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              disabled={
                loading || !code.trim() || (verification !== 'email-code' && password.length < 8)
              }
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none text-center"
              onClick={() => {
                setVerification(undefined);
                setCode('');
                setError('');
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
