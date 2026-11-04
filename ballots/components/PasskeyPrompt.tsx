import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { isPasskeyCanceled, passkeysUsable, registerPasskey } from '../data/passkeys.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';

const OFFER_KEY = 'ballots_offer_passkey';

/** Mark the next signed-in visit to offer saving a passkey. */
export function schedulePasskeyOffer(): void {
  try {
    sessionStorage.setItem(OFFER_KEY, '1');
  } catch {
    // Private mode or blocked storage — skip the offer.
  }
}

function clearPasskeyOffer(): void {
  try {
    sessionStorage.removeItem(OFFER_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function offerIsPending(): boolean {
  try {
    return sessionStorage.getItem(OFFER_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * After a successful password or email-code sign-in, offer to save a passkey.
 * Skipping still leaves the person signed in.
 */
export function PasskeyPrompt(): React.JSX.Element | null {
  const user = useAppUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !offerIsPending()) return undefined;

    let cancelled = false;
    void passkeysUsable().then((usable) => {
      if (cancelled) return;
      if (!usable) {
        clearPasskeyOffer();
        return;
      }
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) clearPasskeyOffer();
  }, [user]);

  function dismiss(): void {
    clearPasskeyOffer();
    setOpen(false);
    setError('');
  }

  async function save(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      await registerPasskey();
      dismiss();
    } catch (cause: unknown) {
      if (isPasskeyCanceled(cause)) {
        dismiss();
      } else {
        setError(errorMessage(cause, 'Could not save a passkey'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user || !open) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl outline-none dark:bg-slate-800 sm:p-6">
          <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Sign in faster next time
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Save a passkey on this device. Next visit you can use Face ID, Touch ID, or your screen
            lock instead of waiting for an email code.
          </Dialog.Description>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <button
              className="w-full cursor-pointer rounded-xl border-none bg-nf-blue py-3 font-semibold text-white transition-colors enabled:hover:bg-nf-blue-mid disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nf-blue-d"
              disabled={loading}
              onClick={() => void save()}
              type="button"
            >
              {loading ? 'Saving…' : 'Save a passkey'}
            </button>
            <Dialog.Close
              className="w-full cursor-pointer rounded-xl border-none bg-transparent py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              type="button"
            >
              Not now
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
