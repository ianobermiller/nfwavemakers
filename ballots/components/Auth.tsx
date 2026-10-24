import { useEffect, useRef, useState } from 'react';
import { cn } from 'cnfast';
import {
  createAccount,
  createPasswordlessAccount,
  requestPasswordReset,
  requestSignInCode,
  signInWithCode,
  signInWithPassword,
} from '../data/auth.ts';
import {
  isPasskeyCanceled,
  passkeyAutofillAvailable,
  passkeysSupported,
  registerPasskey,
  signInWithPasskey,
  signInWithPasskeyAutofill,
} from '../data/passkeys.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { Input } from './ui/Input.tsx';

type Panel = 'signIn' | 'signUp' | 'code';
type SignUpMethod = 'code' | 'password';

const MIN_PASSWORD_LENGTH = 8;

export function Auth(): React.JSX.Element {
  useEffect(() => {
    document.title = 'Ballots — North Florida Wavemakers';
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState<string>();
  const [panel, setPanel] = useState<Panel>('signIn');
  const [signUpMethod, setSignUpMethod] = useState<SignUpMethod>('code');
  const [codeReturn, setCodeReturn] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const autofillRef = useRef<AbortController>();
  const autofillSettled = useRef<Promise<void>>();

  function switchPanel(next: Panel): void {
    setPanel(next);
    setSignUpMethod('code');
    setError('');
    setNotice('');
    setPassword('');
    setPasswordConfirm('');
    setCode('');
    setOtpId(undefined);
  }

  async function submitSignIn(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < MIN_PASSWORD_LENGTH) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await signInWithPassword(normalizedEmail, password);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not sign in'));
    } finally {
      setLoading(false);
    }
  }

  async function submitSignUp(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < MIN_PASSWORD_LENGTH) return;
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await createAccount(normalizedEmail, password);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not create your account'));
    } finally {
      setLoading(false);
    }
  }

  async function sendCode(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      setCodeReturn('signIn');
      setOtpId(await requestSignInCode(normalizedEmail));
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not send a sign-in code'));
    } finally {
      setLoading(false);
    }
  }

  async function sendSignUpCode(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await createPasswordlessAccount(normalizedEmail);
      setCodeReturn('signUp');
      setOtpId(await requestSignInCode(normalizedEmail));
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not send a sign-up code'));
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithPasskey(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const generated = await createPasswordlessAccount(normalizedEmail);
      if (!generated) {
        setError('An account with this email already exists. Sign in instead.');
        return;
      }
      await signInWithPassword(normalizedEmail, generated);
      try {
        await registerPasskey();
      } catch (cause: unknown) {
        if (!isPasskeyCanceled(cause)) {
          setError(errorMessage(cause, 'Account created, but the passkey was not saved'));
        }
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not create your account'));
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

  async function handlePasskeySignIn(): Promise<void> {
    // Only one WebAuthn request can be pending. Drop the autofill offer and let
    // the browser release it, or this request is rejected as already pending.
    autofillRef.current?.abort();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await autofillSettled.current;
      await signInWithPasskey(email);
    } catch (cause: unknown) {
      if (isPasskeyCanceled(cause)) {
        setNotice('Passkey sign-in canceled.');
      } else {
        setError(errorMessage(cause, 'Passkey sign-in failed'));
      }
    } finally {
      setLoading(false);
    }
  }

  const supportsPasskeys = passkeysSupported();
  const showPasskey = supportsPasskeys && panel === 'signIn' && !otpId;

  // Offer saved passkeys in the email field's autofill dropdown on sign-in.
  useEffect(() => {
    if (panel !== 'signIn') return undefined;

    const controller = new AbortController();
    autofillRef.current = controller;
    autofillSettled.current = (async () => {
      if (!supportsPasskeys || !(await passkeyAutofillAvailable()) || controller.signal.aborted) {
        return;
      }
      try {
        await signInWithPasskeyAutofill(controller.signal);
      } catch {
        // Autofill is best effort; the button still works.
      }
    })();

    return () => controller.abort();
  }, [panel, supportsPasskeys]);

  return (
    <div className="flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-nf-blue dark:text-nf-blue-d mb-1">
            North Florida Wavemakers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to judge rounds and review feedback.
          </p>
        </div>

        {!otpId && panel !== 'code' && (
          <div
            role="tablist"
            aria-label="Account"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900"
          >
            <button
              role="tab"
              aria-selected={panel === 'signIn'}
              className={cn(
                'py-2 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors',
                panel === 'signIn'
                  ? 'bg-white dark:bg-slate-800 text-nf-blue dark:text-nf-blue-d shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
              onClick={() => switchPanel('signIn')}
              type="button"
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={panel === 'signUp'}
              className={cn(
                'py-2 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors',
                panel === 'signUp'
                  ? 'bg-white dark:bg-slate-800 text-nf-blue dark:text-nf-blue-d shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
              onClick={() => switchPanel('signUp')}
              type="button"
            >
              Sign up
            </button>
          </div>
        )}

        {otpId ? (
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
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                setPanel(codeReturn === 'signUp' ? 'signUp' : 'code');
                setSignUpMethod('code');
              }}
              type="button"
            >
              Cancel
            </button>
          </form>
        ) : panel === 'code' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendCode();
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
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !email.trim()}
              type="submit"
            >
              {loading ? 'Please wait…' : 'Send Sign-in Code'}
            </button>
            <button
              className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none text-center"
              onClick={() => switchPanel('signIn')}
              type="button"
            >
              Back to password sign in
            </button>
          </form>
        ) : panel === 'signUp' && signUpMethod === 'password' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitSignUp();
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
            <div>
              <label htmlFor="password">Password</label>
              <Input
                autoComplete="new-password"
                id="password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                At least {MIN_PASSWORD_LENGTH} characters
              </p>
            </div>
            <div>
              <label htmlFor="password-confirm">Confirm password</label>
              <Input
                autoComplete="new-password"
                id="password-confirm"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
                type="password"
                value={passwordConfirm}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={
                loading ||
                !email.trim() ||
                password.length < MIN_PASSWORD_LENGTH ||
                passwordConfirm.length < MIN_PASSWORD_LENGTH
              }
              type="submit"
            >
              {loading ? 'Please wait…' : 'Create Account'}
            </button>
            <button
              className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none text-center"
              onClick={() => {
                setSignUpMethod('code');
                setPassword('');
                setPasswordConfirm('');
                setError('');
              }}
              type="button"
            >
              Use an email code
            </button>
          </form>
        ) : panel === 'signUp' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendSignUpCode();
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
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !email.trim()}
              type="submit"
            >
              {loading ? 'Please wait…' : 'Email me a code'}
            </button>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              <button
                className="text-nf-accent underline cursor-pointer bg-transparent border-none"
                onClick={() => {
                  setSignUpMethod('password');
                  setError('');
                  setNotice('');
                }}
                type="button"
              >
                Use a password
              </button>
              {supportsPasskeys && (
                <button
                  className="text-nf-accent underline cursor-pointer bg-transparent border-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !email.trim()}
                  onClick={() => void signUpWithPasskey()}
                  type="button"
                >
                  Use a passkey
                </button>
              )}
            </div>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitSignIn();
            }}
          >
            <div>
              <label htmlFor="email">Email address</label>
              <Input
                aria-describedby={error ? 'auth-error' : undefined}
                aria-invalid={!!error}
                autoComplete={supportsPasskeys ? 'username webauthn' : 'email'}
                autoFocus
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <Input
                autoComplete="current-password"
                id="password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm -mt-2" id="auth-error" role="alert">
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
              disabled={loading || !email.trim() || password.length < MIN_PASSWORD_LENGTH}
              type="submit"
            >
              {loading ? 'Please wait…' : 'Sign In'}
            </button>

            {showPasskey && (
              <>
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />
                  <span className="text-xs uppercase text-slate-400">or</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />
                </div>
                <button
                  className="w-full py-3 border-2 border-nf-blue dark:border-nf-blue-d text-nf-blue dark:text-nf-blue-d enabled:hover:bg-nf-blue-light enabled:dark:hover:bg-slate-700 font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={loading}
                  onClick={() => void handlePasskeySignIn()}
                  type="button"
                >
                  {loading ? 'Please wait…' : 'Sign in with a passkey'}
                </button>
              </>
            )}

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              <button
                className="text-nf-accent underline cursor-pointer bg-transparent border-none"
                onClick={() => void resetPassword()}
                type="button"
              >
                Forgot password?
              </button>
              <button
                className="text-nf-accent underline cursor-pointer bg-transparent border-none"
                onClick={() => switchPanel('code')}
                type="button"
              >
                Use an email code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
