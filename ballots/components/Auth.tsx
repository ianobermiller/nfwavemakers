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
import { Button } from './ui/Button.tsx';
import { CenteredPanel } from './ui/Panel.tsx';
import { FieldError, StatusNote } from './ui/FieldError.tsx';
import { Input } from './ui/Input.tsx';
import { Muted } from './ui/Muted.tsx';

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
    <CenteredPanel>
      <div className="text-center">
        <h1 className="mb-1 text-xl font-bold text-nf-blue dark:text-nf-blue-d">
          Sign in or create account
        </h1>
        <Muted>{subtitle}</Muted>
      </div>

      {panel === 'verify' && otpId ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void verifyCode();
          }}
        >
          <Muted>
            We sent a code to{' '}
            <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.
          </Muted>
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
            <FieldError className="-mt-2" id="code-error">
              {error}
            </FieldError>
          )}
          <Button fullWidth disabled={loading || !code.trim()} type="submit">
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
          <Button variant="link" className="text-center" onClick={showCodePanel}>
            Use a different email
          </Button>
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
            <FieldError className="-mt-2" id="auth-error">
              {error}
            </FieldError>
          )}
          {notice && <StatusNote>{notice}</StatusNote>}
          <Button
            fullWidth
            disabled={loading || !email.trim() || password.length < MIN_PASSWORD_LENGTH}
            type="submit"
          >
            {loading ? 'Please wait…' : 'Sign In'}
          </Button>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
            <Button variant="link" onClick={() => void resetPassword()}>
              Forgot password?
            </Button>
            <Button variant="link" onClick={showCodePanel}>
              Email me a code
            </Button>
            {supportsPasskeys && (
              <Button variant="link" disabled={loading} onClick={() => void handlePasskeySignIn()}>
                Sign in with a passkey
              </Button>
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
            <FieldError className="-mt-2" id="auth-error">
              {error}
            </FieldError>
          )}
          {notice && <StatusNote>{notice}</StatusNote>}
          <Button fullWidth disabled={loading || !email.trim()} type="submit">
            {loading ? 'Please wait…' : 'Email me a code'}
          </Button>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
            <Button variant="link" onClick={showPasswordPanel}>
              Use a password
            </Button>
            {supportsPasskeys && (
              <Button variant="link" disabled={loading} onClick={() => void handlePasskeySignIn()}>
                Sign in with a passkey
              </Button>
            )}
          </div>
        </form>
      )}
    </CenteredPanel>
  );
}
