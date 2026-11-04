import { useEffect, useRef, useState } from 'react';
import {
  createPasswordlessAccount,
  requestPasswordReset,
  requestSignInCode,
  signInWithCode,
  signInWithPassword,
} from '../data/auth.ts';
import {
  isPasskeyCanceled,
  passkeyAutofillAvailable,
  passkeysUsable,
  signInWithPasskey,
  signInWithPasskeyAutofill,
} from '../data/passkeys.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { schedulePasskeyOffer } from './PasskeyPrompt.tsx';
import { Input } from './ui/Input.tsx';

type Panel = 'code' | 'password' | 'verify';

const MIN_PASSWORD_LENGTH = 8;

interface Props {
  purpose?: 'ballots' | 'lessons';
}

export function Auth({ purpose = 'ballots' }: Props): React.JSX.Element {
  useEffect(() => {
    document.title =
      purpose === 'lessons'
        ? 'Sign in for lessons — North Florida Wavemakers'
        : 'Ballots — North Florida Wavemakers';
  }, [purpose]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState<string>();
  const [panel, setPanel] = useState<Panel>('code');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [supportsPasskeys, setSupportsPasskeys] = useState(false);
  const [offerPasskeyAutofill, setOfferPasskeyAutofill] = useState(false);
  const autofillRef = useRef<AbortController>();
  const autofillSettled = useRef<Promise<void>>();

  useEffect(() => {
    void (async () => {
      const usable = await passkeysUsable();
      const autofill = usable ? await passkeyAutofillAvailable() : false;
      setSupportsPasskeys(usable);
      setOfferPasskeyAutofill(autofill);
    })();
  }, []);

  function showCodePanel(): void {
    setPanel('code');
    setError('');
    setNotice('');
    setPassword('');
    setCode('');
    setOtpId(undefined);
  }

  function showPasswordPanel(): void {
    setPanel('password');
    setError('');
    setNotice('');
    setPassword('');
    setCode('');
    setOtpId(undefined);
  }

  async function sendCode(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await createPasswordlessAccount(normalizedEmail);
      setOtpId(await requestSignInCode(normalizedEmail));
      setPanel('verify');
      setCode('');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not send a sign-in code'));
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < MIN_PASSWORD_LENGTH) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await signInWithPassword(normalizedEmail, password);
      schedulePasskeyOffer();
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Could not sign in'));
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
      schedulePasskeyOffer();
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

  // Offer saved passkeys in the email field's autofill dropdown. Only when
  // conditional mediation works — otherwise the `webauthn` token can stall
  // password managers on Android without Google Play Services.
  useEffect(() => {
    if (panel === 'verify' || !offerPasskeyAutofill) return undefined;

    const controller = new AbortController();
    autofillRef.current = controller;
    autofillSettled.current = (async () => {
      if (controller.signal.aborted) return;
      try {
        await signInWithPasskeyAutofill(controller.signal);
      } catch {
        // Autofill is best effort; the link still works.
      }
    })();

    return () => controller.abort();
  }, [panel, offerPasskeyAutofill]);

  const subtitle =
    purpose === 'lessons'
      ? 'Enter your email to read lesson notes.'
      : 'Enter your email to judge rounds and review feedback.';

  return (
    <div className="flex items-start justify-center px-4 py-8 sm:py-16">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:p-8">
        <div className="text-center">
          <h1 className="mb-1 text-xl font-bold text-nf-blue dark:text-nf-blue-d">
            Sign in or create account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {panel === 'verify' && otpId ? (
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
              <p className="text-sm text-red-600 -mt-2" id="code-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full cursor-pointer rounded-xl border-none bg-nf-blue py-3 font-semibold text-white transition-colors enabled:hover:bg-nf-blue-mid disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nf-blue-d"
              disabled={loading || !code.trim()}
              type="submit"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              className="cursor-pointer border-none bg-transparent text-center text-sm text-nf-accent underline"
              onClick={showCodePanel}
              type="button"
            >
              Use a different email
            </button>
          </form>
        ) : panel === 'password' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPassword();
            }}
          >
            <div>
              <label htmlFor="email">Email address</label>
              <Input
                aria-describedby={error ? 'auth-error' : undefined}
                aria-invalid={!!error}
                autoComplete={offerPasskeyAutofill ? 'username webauthn' : 'email'}
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
              <p className="text-sm text-red-600 -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                {notice}
              </p>
            )}
            <button
              className="w-full cursor-pointer rounded-xl border-none bg-nf-blue py-3 font-semibold text-white transition-colors enabled:hover:bg-nf-blue-mid disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nf-blue-d"
              disabled={loading || !email.trim() || password.length < MIN_PASSWORD_LENGTH}
              type="submit"
            >
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              <button
                className="cursor-pointer border-none bg-transparent text-nf-accent underline"
                onClick={() => void resetPassword()}
                type="button"
              >
                Forgot password?
              </button>
              <button
                className="cursor-pointer border-none bg-transparent text-nf-accent underline"
                onClick={showCodePanel}
                type="button"
              >
                Email me a code
              </button>
              {supportsPasskeys && (
                <button
                  className="cursor-pointer border-none bg-transparent text-nf-accent underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void handlePasskeySignIn()}
                  type="button"
                >
                  Sign in with a passkey
                </button>
              )}
            </div>
          </form>
        ) : (
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
                autoComplete={offerPasskeyAutofill ? 'username webauthn' : 'email'}
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
              <p className="text-sm text-red-600 -mt-2" id="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                {notice}
              </p>
            )}
            <button
              className="w-full cursor-pointer rounded-xl border-none bg-nf-blue py-3 font-semibold text-white transition-colors enabled:hover:bg-nf-blue-mid disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nf-blue-d"
              disabled={loading || !email.trim()}
              type="submit"
            >
              {loading ? 'Please wait…' : 'Email me a code'}
            </button>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              <button
                className="cursor-pointer border-none bg-transparent text-nf-accent underline"
                onClick={showPasswordPanel}
                type="button"
              >
                Use a password
              </button>
              {supportsPasskeys && (
                <button
                  className="cursor-pointer border-none bg-transparent text-nf-accent underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void handlePasskeySignIn()}
                  type="button"
                >
                  Sign in with a passkey
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
