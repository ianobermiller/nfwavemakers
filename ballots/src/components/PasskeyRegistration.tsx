import { useState } from 'react';
import { isPasskeyCanceled, passkeysSupported, registerPasskey } from '../data/passkeys.ts';
import { errorMessage } from '../data/pocketbase.ts';

export function PasskeyRegistration(): React.JSX.Element {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const supported = passkeysSupported();

  async function register(): Promise<void> {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await registerPasskey();
      setNotice('Passkey added. You can now use it to sign in.');
    } catch (cause: unknown) {
      if (isPasskeyCanceled(cause)) {
        setNotice('Passkey setup canceled.');
      } else {
        setError(errorMessage(cause, 'Could not add your passkey'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-slate-200 dark:border-slate-700 pt-5 mt-1">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">Passkeys</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
        Use Face ID, Touch ID, or your device screen lock to sign in.
      </p>
      {error && (
        <p className="text-red-600 text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3" role="status">
          {notice}
        </p>
      )}
      <button
        className="w-full py-3 border-2 border-nf-blue dark:border-nf-blue-d text-nf-blue dark:text-nf-blue-d enabled:hover:bg-nf-blue-light enabled:dark:hover:bg-slate-700 font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={loading || !supported}
        onClick={() => void register()}
        type="button"
      >
        {loading ? 'Adding passkey…' : supported ? 'Add a passkey' : 'Passkeys unavailable'}
      </button>
    </section>
  );
}
