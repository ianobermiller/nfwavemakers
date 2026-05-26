import { useState } from 'react';
import { db } from '../db.ts';

export function Auth(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode(): Promise<void> {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setCodeSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function signIn(): Promise<void> {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

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

        {!codeSent ? (
          <>
            <div>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void sendCode()}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm -mt-2">{error}</p>}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              onClick={() => void sendCode()}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending…' : 'Send Magic Code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We sent a 6-digit code to <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.
            </p>
            <div>
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void signIn()}
                placeholder="123456"
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm -mt-2">{error}</p>}
            <button
              className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              onClick={() => void signIn()}
              disabled={loading || !code.trim()}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <button
              className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none text-center"
              onClick={() => setCodeSent(false)}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
